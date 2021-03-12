/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const environment = require('@balena/jellyfish-environment').defaultEnvironment

module.exports = async (context, jellyfish, worker, session, cards) => {
	logger.info(context, 'Setting up guest user')

	const guestUser = await jellyfish.replaceCard(
		context, session, cards['user-guest'])

	const guestUserSession = await jellyfish.replaceCard(
		context, session, jellyfish.defaults({
			slug: 'session-guest',
			version: '1.0.0',
			type: 'session@1.0.0',
			data: {
				actor: guestUser.id
			}
		}))

	logger.info(context, 'Done setting up guest session')
	logger.info(context, 'Setting default cards')

	const cardsToSkip = [ 'user-guest' ]

	// Only need test user role during development and CI.
	if (environment.isProduction() && !environment.isCI()) {
		cardsToSkip.push('role-user-test')
	}

	const cardLoaders = _
		.values(cards)
		.filter(
			(card) => {
				return !cardsToSkip.includes(card.slug)
			}
		)

	await Bluebird.each(cardLoaders, async (card) => {
		if (!card) {
			return
		}

		// Skip cards that already exist and do not need updating
		// Need to update omitted list if any similar fields are added to the schema
		card.name = (card.name) ? card.name : null
		const currentCard = await jellyfish.getCardBySlug(context, session, `${card.slug}@${card.version}`)
		if (currentCard && _.isEqual(card,
			_.omit(currentCard, [ 'id', 'created_at', 'updated_at', 'linked_at', 'old_created_at', 'old_updated_at' ]))) {
			return
		}

		const typeCard = await jellyfish.getCardBySlug(context, session, ensureTypeHasVersion(card.type))

		logger.info(context, 'Inserting default card using worker', {
			slug: card.slug,
			type: card.type
		})

		await worker.replaceCard(context, session, typeCard, {
			attachEvents: false
		}, card)

		logger.info(context, 'Inserted default card using worker', {
			slug: card.slug,
			type: card.type
		})
	})

	return {
		guestSession: guestUserSession
	}
}

const ensureTypeHasVersion = (type) => {
	if (_.includes(type, '@')) {
		return type
	}

	// Types should not default to latest to ensure old "insert" code doesn't break
	return `${type}@1.0.0`
}

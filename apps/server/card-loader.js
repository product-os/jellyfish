/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const $RefParser = require('json-schema-ref-parser')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const environment = require('@balena/jellyfish-environment')
const defaultCards = require('./default-cards')

const loadCard = async (card) => {
	return $RefParser.dereference(card)
}

module.exports = async (context, jellyfish, worker, session) => {
	logger.info(context, 'Setting up guest user')

	const guestUser = await jellyfish.replaceCard(
		context, session, await loadCard(defaultCards.userGuest))

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
	if (environment.isProduction()) {
		cardsToSkip.push('role-user-test')
	}

	const cardLoaders = _
		.values(defaultCards)
		.filter(
			(card) => {
				return !cardsToSkip.includes(card.slug)
			}
		)
		.map(loadCard)

	await Bluebird.each(cardLoaders, async (card) => {
		if (!card) {
			return
		}

		// Skip cards that already exist and do not need updating
		// Need to update omitted list if any similar fields are added to the schema
		card.name = (card.name) ? card.name : null
		const currentCard = await jellyfish.getCardBySlug(context, session, `${card.slug}@${card.version}`)
		if (currentCard && _.isEqual(card,
			_.omit(currentCard, [ 'id', 'created_at', 'updated_at', 'linked_at', 'new_created_at', 'new_updated_at' ]))) {
			return
		}

		const typeCard = await jellyfish.getCardBySlug(
			context, session, `${card.type}@${card.version}`)

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

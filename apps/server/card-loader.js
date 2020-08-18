/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const environment = require('@balena/jellyfish-environment')

const attachCreateEventIfNotExists = async (context, jellyfish, worker, session) => {
	const triggeredActions = await jellyfish.query(context, session, {
		type: 'object',
		properties: {
			type: {
				const: 'triggered-action@1.0.0'
			},
			active: {
				const: true
			}
		},
		required: [ 'type', 'active' ]
	})

	await Bluebird.map(triggeredActions, async (triggeredAction) => {
		const createEventCard = (await jellyfish.query(context, session, {
			type: 'object',
			properties: {
				type: {
					const: 'create@1.0.0'
				}
			},
			required: [
				'type',
				'links'
			],
			$$links: {
				'is attached to': {
					type: 'object',
					properties: {
						id: {
							const: triggeredAction.id
						}
					},
					required: [
						'id'
					]
				}
			}
		}, {
			limit: 1
		}))[0]

		if (createEventCard) {
			return
		}

		const time = new Date()
		const actionContext = worker.getActionContext(context)
		const sessionCard = await jellyfish.getCardById(
			context, jellyfish.sessions.admin, session)

		const request = {
			action: 'action-create-event@1.0.0',
			card: triggeredAction,
			actor: sessionCard.data.actor,
			context,
			timestamp: time.toISOString(),
			epoch: time.valueOf(),
			arguments: {
				name: null,
				type: 'create',
				payload: triggeredAction,
				tags: []
			}
		}

		await worker.library['action-create-event'].handler(
			session,
			actionContext,
			triggeredAction,
			request
		)
	})
}

module.exports = async (context, jellyfish, worker, session) => {
	logger.info(context, 'Setting up guest user')

	const guestUser = await jellyfish.replaceCard(
		context, session, context.defaultCards.userGuest)

	const guestUserSession = await jellyfish.replaceCard(
		context, session, jellyfish.defaults({
			slug: 'session-guest',
			version: '1.0.0',
			type: 'session@1.0.0',
			data: {
				actor: guestUser.id
			}
		}))

	// Make sure all loaded cards have create events attached.
	// Remove this code as soon as migration is done.
	await attachCreateEventIfNotExists(
		context,
		jellyfish,
		worker,
		session
	)

	logger.info(context, 'Done setting up guest session')
	logger.info(context, 'Setting default cards')

	const cardsToSkip = [ 'user-guest' ]
	if (environment.isProduction()) {
		cardsToSkip.push('role-user-test')
	}

	const cardLoaders = _
		.values(context.defaultCards)
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
			_.omit(currentCard, [ 'id', 'created_at', 'updated_at', 'linked_at', 'new_created_at', 'new_updated_at' ]))) {
			return
		}

		const typeCard = await jellyfish.getCardBySlug(
			context, session, `${card.type}@${card.version}`)

		logger.info(context, 'Inserting default card using worker', {
			slug: card.slug,
			type: card.type
		})

		const sessionCard = await jellyfish.getCardById(
			context, jellyfish.sessions.admin, session)

		await worker.replaceCard(context, session, typeCard, {
			attachEvents: true,
			actor: sessionCard.data.actor
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

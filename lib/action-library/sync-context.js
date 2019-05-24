/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const logger = require('../logger').getLogger(__filename)

const getOrCreate = async (workerContext, session, object) => {
	const card = await workerContext.getCardBySlug(session, object.slug, {
		type: object.type
	})
	if (card) {
		return card.id
	}

	const typeCard = await workerContext.getCardBySlug(
		session, object.type, {
			type: 'type'
		})
	if (!typeCard) {
		return null
	}

	const sessionCard = await workerContext.getCardById(session, session, {
		type: 'session'
	})
	if (!sessionCard) {
		return null
	}

	const result = await workerContext.insertCard(session, typeCard, {
		attachEvents: true,
		override: true,
		timestamp: new Date(),
		actor: sessionCard.data.actor
	}, _.omit(object, [ 'type' ]))

	// The result of an upsert might be null if the upsert
	// didn't change anything (a no-op update), so in that
	// case we can fetch the user card from the database.
	if (!result) {
		const existentCard = await workerContext.getCardBySlug(
			session, object.slug, {
				type: typeCard.slug
			})
		if (!existentCard) {
			return null
		}

		return existentCard.id
	}

	return result.id
}

/*
 * Deal with some username differences that we can't
 * fix in any other way.
 */
const ACTOR_TRANSLATE_MAP = {
	_Page: 'Page-'
}

exports.fromWorkerContext = (workerContext, context, session) => {
	return {
		log: {
			warn: (message, data) => {
				// eslint-disable-next-line jellyfish/logger-string-expression
				logger.warn(context, message, data)
			},
			error: (message, data) => {
				// eslint-disable-next-line jellyfish/logger-string-expression
				logger.error(context, message, data)
			},
			debug: (message, data) => {
				// eslint-disable-next-line jellyfish/logger-string-expression
				logger.debug(context, message, data)
			},
			info: (message, data) => {
				// eslint-disable-next-line jellyfish/logger-string-expression
				logger.info(context, message, data)
			}
		},
		getActorId: async (username) => {
			const translatedUsername = (ACTOR_TRANSLATE_MAP[username] || username)
				.toLowerCase()
				.replace(/[^a-z0-9-]/g, '-')
			return getOrCreate(workerContext, session, {
				slug: `user-${translatedUsername}`,
				type: 'user',
				version: '1.0.0',
				data: {
					roles: [],
					disallowlogin: true,
					email: translatedUsername.includes('@')
						? translatedUsername
						: 'new@change.me'
				}
			})
		},
		upsertElement: async (type, object, options) => {
			const typeCard = await workerContext.getCardBySlug(session, type, {
				type: 'type'
			})

			if (!typeCard) {
				throw new workerContext.errors.WorkerNoElement(`No such type: ${type}`)
			}

			return workerContext.insertCard(session, typeCard, {
				attachEvents: true,
				override: true,
				timestamp: options.timestamp,
				actor: options.actor,
				originator: options.originator
			}, object)
		},
		getElementBySlug: async (type, slug) => {
			return workerContext.getCardBySlug(session, slug, {
				type
			})
		},
		getElementById: async (type, id) => {
			return workerContext.getCardById(session, id, {
				type
			})
		},
		getElementByMirrorId: async (type, mirrorId) => {
			if (!mirrorId) {
				throw new Error('You must supply a mirrorId as key')
			}
			const elements = await workerContext.query(session, {
				type: 'object',
				required: [ 'type', 'data' ],
				additionalProperties: true,
				properties: {
					type: {
						type: 'string',
						const: type
					},
					data: {
						type: 'object',
						required: [ 'mirrors' ],
						additionalProperties: true,
						properties: {
							mirrors: {
								type: 'array',
								contains: {
									type: 'string',
									const: mirrorId
								}
							}
						}
					}
				}
			}, {
				limit: 1
			})

			return elements[0]
		}
	}
}

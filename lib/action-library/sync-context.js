/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../logger').getLogger(__filename)

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
		getActorId: async (type, username) => {
			if (type !== 'user' && type !== 'account') {
				return null
			}

			const slug = `${type}-${username.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`
			const actorCard = await workerContext.getCardBySlug(session, slug, {
				type
			})

			if (actorCard) {
				return actorCard.id
			}

			const typeCard = await workerContext.getCardBySlug(
				session, type, {
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

			const data = {}

			if (type === 'account') {
				data.handle = username.split('@')[0]
				if (username.includes('@')) {
					data.email = username
				}
			} else {
				data.email = 'new@change.me'
				data.roles = []
				data.disallowLogin = true
			}

			const result = await workerContext.insertCard(session, typeCard, {
				attachEvents: true,
				override: true,
				timestamp: new Date(),
				actor: sessionCard.data.actor
			}, {
				slug,
				version: '1.0.0',
				data
			})

			return result.id
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

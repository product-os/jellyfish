/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const jsonpatch = require('fast-json-patch')
const logger = require('../logger').getLogger(__filename)
const assert = require('../assert')

/*
 * Deal with some username differences that we can't
 * fix in any other way.
 */
const ACTOR_TRANSLATORS = {
	discourse: [
		{
			local: 'page-',
			remote: '_page'
		}
	]
}

exports.fromWorkerContext = (provider, workerContext, context, session) => {
	const getDefaultActor = async () => {
		const sessionCard = await workerContext.getCardById(
			session, session, {
				type: 'session'
			})

		if (!sessionCard) {
			return null
		}

		return sessionCard.data.actor
	}

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
		getLocalUsername: (username) => {
			const map = _.find(ACTOR_TRANSLATORS[provider] || [], {
				remote: username
			})

			return map ? map.local : username
		},
		getRemoteUsername: (username) => {
			const map = _.find(ACTOR_TRANSLATORS[provider] || [], {
				local: username
			})

			return map ? map.remote : username
		},
		upsertElement: async (type, object, options) => {
			const typeCard = await workerContext.getCardBySlug(session, type, {
				type: 'type'
			})

			assert.INTERNAL(context, typeCard,
				workerContext.errors.WorkerNoElement, `No such type: ${type}`)

			const actor = options.actor || await getDefaultActor()

			const current = await workerContext.getCardBySlug(
				session, object.slug, {
					type: object.type
				})

			if (!current) {
				return workerContext.insertCard(session, typeCard, {
					attachEvents: true,
					timestamp: options.timestamp,
					actor,
					originator: options.originator
				}, object)
			}

			// TODO: Expose a JSON patch interface on this function
			// so we don't have to do this diff comparison thing.
			const patch = jsonpatch.compare(
				workerContext.defaults(current),
				workerContext.defaults(Object.assign({}, object, {
					id: current.id,
					name: typeof object.name === 'string'
						? object.name
						: current.name || null,
					created_at: current.created_at,
					updated_at: current.updated_at,
					linked_at: current.linked_at,
					type: current.type
				})))

			return workerContext.patchCard(session, typeCard, {
				attachEvents: true,
				timestamp: options.timestamp,
				actor,
				originator: options.originator
			}, current, patch)
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
			assert.INTERNAL(context, mirrorId,
				Error, 'You must supply a mirrorId as key')

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

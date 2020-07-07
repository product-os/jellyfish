/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const jsonpatch = require('fast-json-patch')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const assert = require('@balena/jellyfish-assert')

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
			session, session)

		if (!sessionCard) {
			return null
		}

		return sessionCard.data.actor
	}

	const contextObject = {
		log: {
			warn: (message, data) => {
				logger.warn(context, message, data)
			},
			error: (message, data) => {
				logger.error(context, message, data)
			},
			debug: (message, data) => {
				logger.debug(context, message, data)
			},
			info: (message, data) => {
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
			const typeCard = await workerContext.getCardBySlug(
				session, type)

			assert.INTERNAL(context, typeCard,
				workerContext.errors.WorkerNoElement, `No such type: ${type}`)

			const actor = options.actor || await getDefaultActor()

			const current = await workerContext.getCardBySlug(
				session, `${object.slug}@${object.version}`)

			if (!current) {
				logger.info(context, 'Inserting card from sync context', object)
				return workerContext.insertCard(session, typeCard, {
					attachEvents: true,
					timestamp: options.timestamp,
					actor,
					originator: options.originator
				}, object).catch((error) => {
					// Retry, and next time we will automatically go
					// to through patch approach
					if (error.name === 'JellyfishElementAlreadyExists') {
						return contextObject.upsertElement(type, object, options)
					}

					throw error
				})
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

			logger.info(context, 'Patching card from sync context', {
				slug: current.slug,
				patch
			})

			return workerContext.patchCard(session, typeCard, {
				attachEvents: true,
				timestamp: options.timestamp,
				actor,
				originator: options.originator
			}, current, patch)
		},
		getElementBySlug: async (slug) => {
			return workerContext.getCardBySlug(session, slug)
		},
		getElementById: async (id) => {
			return workerContext.getCardById(session, id)
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

	return contextObject
}

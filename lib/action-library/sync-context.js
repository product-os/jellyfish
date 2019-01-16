/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

			const slug = `${type}-${username.toLowerCase().replace(/[@|._]/g, '-')}`
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

			const data = type === 'account'
				? {
					email: username
				}
				: {
					email: 'new@change.me',
					roles: [],
					disallowLogin: true
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
				actor: options.actor
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
			})

			return elements[0]
		}
	}
}

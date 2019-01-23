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

const _ = require('lodash')
const uuid = require('uuid/v4')
const logger = {
	warn: _.noop,
	error: _.noop,
	debug: _.noop,
	info: _.noop
}

const store = []
const slugIndex = new Map()
const idIndex = new Map()

const api = {
	getCardBySlug (slug) {
		const storeIndex = slugIndex.get(slug)
		if (!storeIndex) {
			Promise.resolve(null)
		}

		return Promise.resolve(store[storeIndex])
	},

	getCardById (id) {
		const storeIndex = idIndex.get(id)
		if (!storeIndex) {
			Promise.resolve(null)
		}

		return Promise.resolve(store[storeIndex])
	},

	insertCard (options, card) {
		const indexBySlug = card.slug ? slugIndex.get(card.slug) : null
		const indexById = card.id ? idIndex.get(card.id) : null
		if ((indexBySlug || indexById) && !options.override) {
			return Promise.resolve(null)
		}

		const id = uuid()
		const cardWithId = {
			id, created_at: new Date().toISOString(), ...card
		}

		if (indexBySlug || indexById) {
			const index = indexBySlug || indexById
			store[index] = cardWithId

			idIndex.set(card.id, index)
			if (card.slug) {
				slugIndex.set(card.slug, index)
			}

			return Promise.resolve(cardWithId)
		}

		store.push(cardWithId)
		const newCardIndex = store.length - 1
		idIndex.set(id, newCardIndex)
		if (card.slug) {
			slugIndex.set(card.slug, newCardIndex)
		}

		return Promise.resolve(cardWithId)
	},

	getByMirrorId (mirrorId) {
		return Promise.resolve(store.find((card) => {
			if (card.data && card.data.mirrors) {
				return card.data.mirrors.includes(mirrorId)
			}

			return false
		}))
	}
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
		getActorId: async (type, username) => {
			if (type !== 'user' && type !== 'account') {
				return null
			}

			const slug = `${type}-${username.toLowerCase().replace(/[@|._]/g, '-')}`

			const actorCard = await api.getCardBySlug(slug)

			if (actorCard) {
				return actorCard.id
			}

			const sessionCard = await api.getCardById(session)

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

			const result = await api.insertCard({
				override: true
			}, {
				slug,
				version: '1.0.0',
				data
			})

			return result.id
		},

		upsertElement: async (type, object, options) => {
			// This requires pre-loading data in the store, might not be required for testing purposes.
			// const typeCard = await api.getCardBySlug(type)

			// if (!typeCard) {
			// 	throw new Error(`No such type: ${type}`)
			// }

			return api.insertCard({
				override: true
			}, object)
		},

		getElementBySlug: async (type, slug) => {
			return api.getCardBySlug(slug)
		},

		getElementById: async (type, id) => {
			return api.getCardById(id)
		},

		getElementByMirrorId: async (type, mirrorId) => {
			return api.getByMirrorId(mirrorId)
		}
	}
}

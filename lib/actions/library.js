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
const time = require('./time')
const errors = require('./errors')

module.exports = {
	'action-create-session': async (session, worker, card, options, args) => {
		const user = await worker.getCardById(worker.session, card.id)
		if (!user) {
			throw new errors.ActionsAuthenticationError(`No such user: ${card.id}`)
		}

		if (user.data.password && args.password.hash !== user.data.password.hash) {
			throw new errors.ActionsAuthenticationError('Invalid password')
		}

		const sessionTypeCard = await worker.getCardBySlug(session, 'session', {
			type: 'type'
		})

		if (!sessionTypeCard) {
			throw new errors.ActionsNoElement('No such type: session')
		}

		return worker.insertCard(worker.session, sessionTypeCard, {
			timestamp: options.timestamp,
			actor: options.actor,
			events: true,
			override: false
		}, {
			data: {
				actor: card.id,
				expiration: time.getFutureTimestampByDays(7)
			}
		})
	},
	'action-create-user': async (session, worker, card, options, args) => {
		return worker.insertCard(session, card, {
			timestamp: options.timestamp,
			actor: options.actor,
			events: true,
			override: false
		}, {
			slug: args.properties.username,
			data: {
				email: args.properties.email,
				roles: args.properties.roles,
				password: {
					hash: args.properties.hash
				}
			}
		})
	},
	'action-create-event': async (session, worker, card, options, args) => {
		const typeCard = await worker.getCardBySlug(session, args.type, {
			type: 'type'
		})

		if (!typeCard) {
			throw new errors.ActionsNoElement(`No such type: ${args.type}`)
		}

		return worker.insertCard(session, typeCard, {
			timestamp: options.timestamp,
			actor: options.actor,
			events: false,
			override: false
		}, {
			data: {
				timestamp: options.timestamp,
				target: card.id,
				actor: options.actor,
				payload: args.payload
			}
		})
	},
	'action-create-card': async (session, worker, card, options, args) => {
		return worker.insertCard(session, card, {
			timestamp: options.timestamp,
			actor: options.actor,
			events: true,
			override: false
		}, args.properties)
	},
	'action-upsert-card': async (session, worker, card, options, args) => {
		return worker.insertCard(session, card, {
			timestamp: options.timestamp,
			actor: options.actor,
			events: true,
			override: true
		}, args.properties)
	},
	'action-set-add': async (session, worker, card, options, args) => {
		const source = _.get(card, args.property, [])
		const initialLength = source.length
		const input = _.isArray(args.value) ? args.value : [ args.value ]

		for (const element of input) {
			if (!_.includes(source, element)) {
				source.push(element)
			}
		}

		if (initialLength === source.length) {
			return card
		}

		const typeCard = await worker.getCardBySlug(session, card.type, {
			type: 'type'
		})

		if (!typeCard) {
			throw new errors.ActionsNoElement(`No such type: ${card.type}`)
		}

		_.set(card, args.property, source)
		return worker.insertCard(session, typeCard, {
			timestamp: options.timestamp,
			actor: options.actor,
			events: true,
			override: true
		}, card)
	},
	'action-update-card': async (session, worker, card, options, args) => {
		const updatedCard = _.mergeWith({}, card, args.properties, (objectValue, sourceValue) => {
			if (_.isArray(objectValue)) {
				return sourceValue
			}

			// This lodash function expects undefined
			// eslint-disable-next-line no-undefined
			return undefined
		})

		if (_.isEqual(card, updatedCard)) {
			return card
		}

		const typeCard = await worker.getCardBySlug(session, updatedCard.type, {
			type: 'type'
		})

		if (!typeCard) {
			throw new errors.ActionsNoElement(`No such type: ${updatedCard.type}`)
		}

		return worker.insertCard(session, typeCard, {
			timestamp: options.timestamp,
			actor: options.actor,
			events: true,
			override: true
		}, _.omit(updatedCard, [ 'type' ]))
	}
}

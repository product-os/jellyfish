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
const Bluebird = require('bluebird')
const time = require('./time')
const jellyscript = require('../jellyscript')

const expandCard = async (jellyfish, session, card) => {
	const expandedCard = _.cloneDeep(card)
	if (_.has(card, [ 'data', 'target' ])) {
		expandedCard.data.target =
			await jellyfish.getCardById(session, card.data.target)
	}

	return expandedCard
}

// TODO: Somehow prevent creating an event card, to force people to
// use the create event action, in order to not attach a create event
// on an event itself (at least for now)
const insertCard = async (jellyfish, worker, card, context, options) => {
	const queryOptions = {
		writeMode: true
	}

	let hasCard = false

	if (options.properties.id && await jellyfish.getCardById(context.session, options.properties.id, queryOptions)) {
		hasCard = true
	}

	if (options.properties.slug && await jellyfish.getCardBySlug(context.session, options.properties.slug, queryOptions)) {
		hasCard = true
	}

	const properties = _.omitBy({
		id: options.properties.id,
		slug: options.properties.slug,
		name: options.properties.name,
		active: _.isNil(options.properties.active) ? true : options.properties.active,
		tags: options.properties.tags || [],
		type: card.slug,
		links: options.properties.links || [],
		data: options.properties.data || {}
	}, _.isNil)

	const typeSchema = _.get(await jellyfish.getCardBySlug(context.session, properties.type, {
		writeMode: true
	}), [ 'data', 'schema' ], null)

	if (!typeSchema) {
		throw new jellyfish.errors.JellyfishUnknownCardType(`Unknown type: ${properties.type}`)
	}

	const result = jellyscript.evaluateObject(typeSchema, properties)
	const id = await jellyfish.insertCard(context.session, result.object, {
		override: options.upsert
	})

	if (options.upsert && hasCard) {
		await worker.executeAction(context.session, {
			actionId: 'action-create-event',
			targetId: id,
			actorId: context.actor
		}, {
			type: 'update',
			payload: _.omit(result.object, [ 'type', 'id' ])
		})
	} else {
		await worker.executeAction(context.session, {
			actionId: 'action-create-event',
			targetId: id,
			actorId: context.actor
		}, {
			type: 'create',
			payload: {}
		})
	}

	// TODO: Generalize and refactor this on top of triggered actions
	for (const watcher of result.watchers) {
		// eslint-disable-next-line no-loop-func
		worker.pipeline.insertFunction(id, async (change) => {
			const expandedCard = await expandCard(jellyfish, context.session, change.after)
			if (!jellyfish.matchesSchema(watcher.filter, expandedCard)) {
				return Bluebird.resolve()
			}

			if (watcher.type === 'AGGREGATE') {
				const value = _.get(change.after, watcher.arguments[0])
				if (!_.isArray(value)) {
					return Bluebird.resolve()
				}

				return worker.executeAction(context.session, {
					actionId: 'action-set-add',
					targetId: _.get(change.after, watcher.target),
					actorId: context.actor
				}, {
					property: _.join(watcher.sourceProperty, '.'),
					value
				})
			}

			return Bluebird.resolve()
		})
	}

	const insertedCard = await jellyfish.getCardById(context.session, id)
	await worker.executeTriggers(context.session, insertedCard)
	return id
}

module.exports = {
	'action-create-session': async (jellyfish, worker, card, context, options) => {
		if (card.data.password && options.password.hash !== card.data.password.hash) {
			throw new jellyfish.errors.JellyfishAuthenticationError('Invalid password')
		}

		const sessionTypeCard = await jellyfish.getCardBySlug(context.session, 'session')
		if (!sessionTypeCard) {
			throw new Error('Unknown type: session')
		}

		return worker.executeAction(context.session, {
			actionId: 'action-create-card',
			targetId: sessionTypeCard.id,
			actorId: context.actor
		}, {
			properties: {
				data: {
					actor: card.id,
					expiration: time.getFutureTimestampByDays(7)
				}
			}
		})
	},
	'action-create-user': async (jellyfish, worker, card, context, options) => {
		return insertCard(jellyfish, worker, card, context, {
			properties: {
				slug: options.properties.username,
				data: {
					email: options.properties.email,
					roles: options.properties.roles,
					password: {
						hash: options.properties.hash
					}
				}
			},
			upsert: false
		})
	},
	'action-create-event': async (jellyfish, worker, card, context, options) => {
		return jellyfish.insertCard(context.session, {
			type: options.type,
			links: [],
			tags: [],
			active: true,
			data: {
				timestamp: context.timestamp,
				target: card.id,
				actor: context.actor,
				payload: options.payload
			}
		})
	},
	'action-create-card': async (jellyfish, worker, card, context, options) => {
		return insertCard(jellyfish, worker, card, context, {
			properties: options.properties,
			upsert: false
		})
	},
	'action-upsert-card': async (jellyfish, worker, card, context, options) => {
		return insertCard(jellyfish, worker, card, context, {
			properties: options.properties,
			upsert: true
		})
	},
	'action-set-add': async (jellyfish, worker, card, context, options) => {
		const source = _.get(card, options.property, [])
		const initialLength = source.length
		const input = _.isArray(options.value) ? options.value : [ options.value ]

		for (const element of input) {
			if (!_.includes(source, element)) {
				source.push(element)
			}
		}

		if (initialLength === source.length) {
			return card.id
		}

		_.set(card, options.property, source)
		return insertCard(jellyfish, worker, {
			slug: card.type
		}, context, {
			properties: card,
			upsert: true
		})
	},
	'action-update-card': async (jellyfish, worker, card, context, options) => {
		const updatedCard = _.mergeWith({}, card, options.properties, (objectValue, sourceValue) => {
			if (_.isArray(objectValue)) {
				return sourceValue
			}

			// This lodash function expects undefined
			// eslint-disable-next-line no-undefined
			return undefined
		})

		if (_.isEqual(card, updatedCard)) {
			return card.id
		}

		const typeCard = await jellyfish.getCardBySlug(context.session, updatedCard.type, {
			writeMode: true
		})

		return insertCard(jellyfish, worker, typeCard, context, {
			properties: _.omit(updatedCard, [ 'type' ]),
			upsert: true
		})
	}
}

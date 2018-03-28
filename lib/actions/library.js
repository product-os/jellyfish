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

// TODO: Somehow prevent creating an event card, to force people to
// use the create event action, in order to not attach a create event
// on an event itself (at least for now)
const insertCard = async (jellyfish, actions, card, context, options) => {
	const identifier = options.properties.id || options.properties.slug
	const hasCard = identifier && Boolean(await jellyfish.getCard(context.session, identifier, {
		inactive: true
	}))

	const properties = _.omitBy({
		id: options.properties.id,
		slug: options.properties.slug,
		name: options.properties.name,
		active: options.properties.active,
		tags: options.properties.tags,
		type: card.slug,
		links: options.properties.links,
		data: options.properties.data
	}, _.isNil)

	const id = await jellyfish.insertCard(context.session, properties, {
		override: options.upsert
	})

	if (options.upsert && hasCard) {
		await actions.executeAction(jellyfish, context.session, 'action-create-event', id, {
			type: 'update',
			payload: _.omit(properties, [ 'type', 'id' ])
		})
	} else {
		await actions.executeAction(jellyfish, context.session, 'action-create-event', id, {
			type: 'create',
			payload: {}
		})
	}

	return id
}

module.exports = {
	'action-user-login': async (jellyfish, actions, card, context, options) => {
		if (card.data.password && options.password.hash !== card.data.password.hash) {
			throw new jellyfish.errors.JellyfishAuthenticationError('Invalid password')
		}

		return actions.executeAction(jellyfish, context.session, 'action-create-card', 'session', {
			properties: {
				data: {
					actor: card.id,
					expiration: time.getFutureTimestampByDays(7)
				}
			}
		})
	},
	'action-create-event': async (jellyfish, actions, card, context, options) => {
		return jellyfish.insertCard(context.session, {
			type: options.type,
			links: [],
			tags: [],
			active: true,
			data: {
				timestamp: context.timestamp,
				target: card.id,
				actor: context.actor.id,
				payload: options.payload
			}
		})
	},
	'action-create-card': async (jellyfish, actions, card, context, options) => {
		return insertCard(jellyfish, actions, card, context, {
			properties: options.properties,
			upsert: false
		})
	},
	'action-upsert-card': async (jellyfish, actions, card, context, options) => {
		return insertCard(jellyfish, actions, card, context, {
			properties: options.properties,
			upsert: true
		})
	},
	'action-update-card': async (jellyfish, actions, card, context, options) => {
		const updatedCard = _.merge({}, card, options.properties)

		if (_.isEqual(card, updatedCard)) {
			return card.id
		}

		const typeCard = await jellyfish.getCard(context.session, updatedCard.type)
		return insertCard(jellyfish, actions, typeCard, context, {
			properties: _.omit(updatedCard, [ 'type' ]),
			upsert: true
		})
	}
}

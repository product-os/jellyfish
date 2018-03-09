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

const actions = {
  'action-create-event': async (database, card, context, options) => {
    return database.insertCard({
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
  'action-insert-card': async (database, card, context, options) => {
    const hasCard = options.properties.slug && Boolean(await database.getCard(options.properties.slug))

    const properties = _.omitBy({
      id: options.upsert ? options.properties.id : null,
      slug: options.properties.slug,
      active: true,
      tags: options.properties.tags || [],

      // TODO: Somehow prevent creating an event card, to force people to
      // use the create event action, in order to not attach a create event
      // on an event itself (at least for now)
      type: card.slug,

      // TODO: Check that links point to existing cards
      links: options.properties.links || [],

      data: options.properties.data
    }, _.isNil)

    const id = await database.insertCard(properties, {
      override: options.upsert
    })

    if (options.upsert && hasCard) {
      await actions['action-create-event'](database, {
        id
      }, context, {
        type: 'update',
        payload: properties
      })
    } else {
      await actions['action-create-event'](database, {
        id
      }, context, {
        type: 'create',
        payload: {}
      })
    }

    return id
  },

  // TODO: Somehow prevent this action from running on an event
  'action-update-property': async (database, card, context, options) => {
    if (_.isEqual(_.get(card, options.property), options.value)) {
      return card.id
    }

    _.set(card, options.property, options.value)

    const id = await database.insertCard(card, {
      override: true
    })

    await actions['action-create-event'](database, {
      id
    }, context, {
      type: options.eventName,
      payload: options.eventPayload
    })

    return id
  }
}

module.exports = actions

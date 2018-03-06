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

const time = require('./time')

module.exports = {
  'action-create-card': async (database, card, context, options) => {
    const properties = {
      type: card.slug,

      // TODO: Check that any links and tags point to existing cards
      links: options.properties.links || [],
      tags: options.properties.tags || []
    }

    if (options.properties.slug) {
      properties.slug = options.properties.slug
    }

    if (options.properties.data) {
      properties.data = options.properties.data
    }

    const id = await database.insertCard(properties)

    await database.insertCard({
      type: 'create',
      links: [],
      tags: [],
      data: {
        timestamp: time.getCurrentTimestamp(),
        target: id,
        actor: context.actor.id
      }
    })

    return id
  }
}

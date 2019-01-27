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

const randomstring = require('randomstring')
const logger = require('../logger').getLogger(__filename)
const actionLibrary = require('../action-library')
const bootstrap = require('./bootstrap')

const getActorKey = async (context, jellyfish, session, actorId) => {
	const keySlug = `session-action-${actorId}`
	const key = await jellyfish.getCardBySlug(context, session, keySlug, {
		type: 'session'
	})

	if (key && key.data.actor === actorId) {
		return key
	}

	logger.info(context, 'Create worker key', {
		slug: keySlug,
		actor: actorId
	})

	return jellyfish.insertCard(context, session, jellyfish.defaults({
		slug: keySlug,
		version: '1.0.0',
		type: 'session',
		data: {
			actor: actorId
		}
	}), {
		override: true
	})
}

exports.startActionRequestServer = async (context, cache, options) => {
	return bootstrap(context, cache, actionLibrary, {
		delay: 10,
		onError: options.onError,
		onLoop: async (serverContext, jellyfish, worker, queue, session) => {
			const actionRequest = await queue.dequeue(serverContext, worker.getId())
			if (!actionRequest) {
				return null
			}

			return getActorKey(
				serverContext, jellyfish, session, actionRequest.data.actor).then((key) => {
				return worker.execute(key.id, actionRequest)
			})
		}
	})
}

exports.startTickServer = async (context, cache, options) => {
	return bootstrap(context, cache, actionLibrary, {
		delay: 2000,
		onError: options.onError,
		onLoop: async (serverContext, jellyfish, worker, queue, session) => {
			return worker.tick({
				id: `TICK-REQUEST-${randomstring.generate(20)}`
			}, session, {
				currentDate: new Date()
			})
		}
	})
}

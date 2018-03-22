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

const Bluebird = require('bluebird')
const debug = require('debug')('jellyfish:actions')
const EventEmitter = require('events').EventEmitter
const time = require('./time')

exports.watch = async (jellyfish) => {
	const view = await jellyfish.getCard('view-non-executed-action-requests')
	const schema = await jellyfish.getSchema(view)
	const stream = await jellyfish.stream(schema)

	const emitter = new EventEmitter()
	emitter.close = stream.close

	stream.on('error', (error) => {
		emitter.emit('error', error)
	})

	stream.on('closed', () => {
		emitter.emit('closed')
	})

	stream.on('data', (change) => {
		const request = change.after
		debug(`Incoming action request ${request.id} (${request.data.action})`)
		emitter.emit('request', request)
	})

	Bluebird.resolve(jellyfish.query(schema))
		.each((request) => {
			debug(`Processing action request from backlog ${request.id} (${request.data.action}`)
			emitter.emit('request', request)
		})
		.catch((error) => {
			stream.close()
			emitter.emit('error', error)
		})

	return emitter
}

exports.processRequest = async (jellyfish, request) => {
	const data = request.data
	const results = await jellyfish.executeAction(data.action, data.target, data.arguments)
	debug(`Action request executed: ${request.id}`)

	const id = await jellyfish.executeAction('action-update-card', request.id, {
		properties: {
			data: {
				executed: true,
				result: {
					timestamp: time.getCurrentTimestamp(),
					data: results
				}
			}
		}
	})

	debug(`Action request results set: ${request.id}`)
	return id
}

exports.createRequest = async (jellyfish, actionId, targetId, actorId, args) => {
	const target = await jellyfish.getCard(targetId)
	if (!target) {
		throw new Error(`No such target: ${targetId}`)
	}

	const actor = await jellyfish.getCard(actorId)
	if (!actor) {
		throw new Error(`No such actor: ${actorId}`)
	}

	// TODO: Ensure the user has permission to request such action

	return jellyfish.executeAction('action-create-card', 'action-request', {
		properties: {
			data: {
				action: actionId,
				actor: actor.id,
				target: target.id,
				timestamp: time.getCurrentTimestamp(),
				executed: false,
				arguments: args
			}
		}
	})
}

exports.listen = async (instance) => {
	const emitter = new EventEmitter()
	const watcher = await exports.watch(instance)

	watcher.on('error', (error) => {
		emitter.emit('error', error)
	})

	watcher.on('request', (request) => {
		exports.processRequest(instance, request).then(() => {
			emitter.emit('request', request)
		}).catch((error) => {
			emitter.emit('error', error)
		})
	})

	return emitter
}

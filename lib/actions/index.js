/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
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
const debug = require('debug')('jellyfish:actions')
const EventEmitter = require('events').EventEmitter
const objectTemplate = require('object-template')
const library = require('./library')
const time = require('./time')
const computedProperties = require('./computed-properties')

exports.watch = async (jellyfish, session) => {
	const view = await jellyfish.getCard(session, 'view-non-executed-action-requests')
	const schema = await jellyfish.getSchema(view)
	const stream = await jellyfish.stream(session, schema)

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

	Bluebird.resolve(jellyfish.query(session, schema))
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

exports.processRequest = async (jellyfish, session, request) => {
	const data = request.data

	return Bluebird.resolve(
		exports.executeAction(jellyfish, session, data.action, data.target, data.arguments)
	).then((results) => {
		debug(`Action request executed: ${request.id}`)

		return exports.executeAction(jellyfish, session, 'action-update-card', request.id, {
			properties: {
				data: {
					executed: true,
					result: {
						error: false,
						timestamp: time.getCurrentTimestamp(),
						data: results
					}
				}
			}
		})
	}).catch((error) => {
		return exports.executeAction(jellyfish, session, 'action-update-card', request.id, {
			properties: {
				data: {
					executed: true,
					result: {
						error: true,
						timestamp: time.getCurrentTimestamp(),
						data: error.message
					}
				}
			}
		})
	}).tap((id) => {
		debug(`Action request results set: ${request.id}`)
	})
}

exports.createRequest = async (jellyfish, session, options) => {
	const target = await jellyfish.getCard(session, options.targetId)
	if (!target) {
		throw new Error(`No such target: ${options.targetId}`)
	}

	const actor = await jellyfish.getCard(session, options.actorId)
	if (!actor) {
		throw new Error(`No such actor: ${options.actorId}`)
	}

	// TODO: Ensure the user has permission to request such action

	return exports.executeAction(jellyfish, session, 'action-create-card', 'action-request', _.omitBy({
		properties: {
			transient: options.transient,
			data: {
				action: options.action,
				actor: actor.id,
				target: target.id,
				timestamp: time.getCurrentTimestamp(),
				executed: false,
				arguments: options.arguments
			}
		}
	}, _.isNil))
}

/**
 * @summary Execute an action card
 * @function
 * @public
 *
 * @param {Object} jellyfish - jellyfish SDK instance
 * @param {String} session - session id
 * @param {String} actionId - action id
 * @param {String} targetId - target id
 * @param {Object} args - action arguments
 * @returns {Any} action result
 *
 * @example
 * const jellyfish = sdk.create({ ... })
 *
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const id = await actions.executeAction(jellyfish, session, 'action-create-card', 'user', {
 *   properties: {
 *     slug: 'johndoe',
 *     data: {
 *       email: 'johndoe@gmail.com'
 *     }
 *   }
 * })
 */
exports.executeAction = async (jellyfish, session, actionId, targetId, args) => {
	const actionCard = await jellyfish.getCard(session, actionId)
	if (!actionCard) {
		throw new jellyfish.errors.JellyfishNoAction(`Unknown action: ${actionId}`)
	}

	const targetCard = await jellyfish.getCard(session, targetId, {

		// We must allow users to execute actions on inactive cards,
		// otherwise there is no way to restore them, or create
		// inactive cards.
		inactive: true

	})

	if (!targetCard) {
		throw new jellyfish.errors.JellyfishNoElement(`Unknown target: ${targetId}`)
	}

	const cardSchema = jellyfish.getSchema(await jellyfish.getCard(session, 'card'))

	if (!jellyfish.matchesSchema(cardSchema, actionCard)) {
		throw new jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
	}

	if (!jellyfish.matchesSchema(cardSchema, targetCard)) {
		throw new jellyfish.errors.JellyfishSchemaMismatch(`Invalid target: ${targetCard.id}`)
	}

	const actionSchema = jellyfish.getSchema(await jellyfish.getCard(session, 'action'))

	if (!jellyfish.matchesSchema(actionSchema, actionCard)) {
		throw new jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
	}

	if (!jellyfish.matchesSchema(_.get(actionCard, [ 'data', 'filter' ], {
		type: 'object'
	}), targetCard)) {
		throw new jellyfish.errors.JellyfishSchemaMismatch('Target does not match filter')
	}

	const argumentNames = _.keys(actionCard.data.arguments)
	const argumentsSchema = _.isEmpty(argumentNames)
		? {
			type: 'object'
		}
		: {
			type: 'object',
			properties: actionCard.data.arguments,
			additionalProperties: false,
			required: argumentNames
		}

	const computedArguments = computedProperties.compile(args)

	if (!jellyfish.matchesSchema(argumentsSchema, computedArguments)) {
		throw new jellyfish.errors.JellyfishSchemaMismatch('Arguments do not match')
	}

	const compiledArguments = objectTemplate.compile(actionCard.data.options, {
		arguments: computedArguments
	}, {
		delimiters: [ '\\[', '\\]' ]
	})

	// Support for actions that extend other actions

	const superActionSlug = _.get(actionCard, [ 'data', 'extends' ], null)
	if (superActionSlug) {
		debug(`Executing super action ${superActionSlug}`)
		return exports.executeAction(jellyfish, session, superActionSlug, targetId, compiledArguments)
	}

	const actionFunction = library[actionCard.slug]
	if (!actionFunction) {
		throw new jellyfish.errors.JellyfishNoAction(`Unknown action function: ${actionCard.slug}`)
	}

	debug(`Executing internal action ${actionCard.slug}`)
	return actionFunction(jellyfish, exports, targetCard, {
		// Always use the admin user for now
		actor: await jellyfish.getCard(session, 'user-admin'),
		timestamp: time.getCurrentTimestamp(),
		session
	}, compiledArguments)
}

exports.setup = async (jellyfish, session, options) => {
	// We assume the given token should have enough permissions
	const sessionCard = await jellyfish.getCard(session, session)
	if (!sessionCard) {
		throw new jellyfish.errors.JellyfishNoElement('Invalid session')
	}

	if (!await jellyfish.getCard(session, `user-${options.username}`)) {
		const signupRequestId = await exports.createRequest(jellyfish, session, {
			targetId: 'user',
			actorId: sessionCard.id,
			action: 'action-create-user',
			transient: {
				password: options.password
			},
			arguments: {
				email: options.email,
				username: options.username,
				salt: '{{ GENERATESALT() }}',
				hash: '{{ HASH(properties.transient.password, properties.data.arguments.salt) }}'
			}
		})

		const signupRequest = await jellyfish.getCard(session, signupRequestId)
		await exports.processRequest(jellyfish, session, signupRequest)
	}

	const actor = await jellyfish.getCard(session, `user-${options.username}`)
	if (!actor) {
		throw new jellyfish.errors.JellyfishNoElement(`Unknown user: ${options.username}`)
	}

	const loginRequestId = await exports.createRequest(jellyfish, session, {
		targetId: actor.id,
		actorId: sessionCard.id,
		action: 'action-create-session',
		transient: {
			password: options.password
		},
		arguments: {
			password: {
				hash: `{{ HASH(properties.transient.password, '${actor.data.password.salt}') }}`
			}
		}
	})

	const loginRequest = await jellyfish.getCard(session, loginRequestId)
	await exports.processRequest(jellyfish, session, loginRequest)
	const completedLoginRequest = await jellyfish.getCard(session, loginRequestId)
	return completedLoginRequest.data.result.data
}

exports.listen = async (jellyfish, session) => {
	const emitter = new EventEmitter()
	const watcher = await exports.watch(jellyfish, session)

	watcher.on('error', (error) => {
		emitter.emit('error', error)
	})

	watcher.on('request', (request) => {
		exports.processRequest(jellyfish, session, request).then(() => {
			emitter.emit('request', request)
		}).catch((error) => {
			emitter.emit('error', error)
		})
	})

	return emitter
}

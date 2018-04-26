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

class ActionRequestWorker {
	constructor (jellyfish, session) {
		this.jellyfish = jellyfish
		this.session = session
	}

	async start () {
		const emitter = new EventEmitter()
		const watcher = await this.watch()

		watcher.on('error', (error) => {
			emitter.emit('error', error)
		})

		watcher.on('request', (request) => {
			this.processRequest(request).then(() => {
				emitter.emit('request', request)
			}).catch((error) => {
				emitter.emit('error', error)
			})
		})

		return emitter
	}

	async watch () {
		const view = await this.jellyfish.getCardBySlug(this.session, 'view-non-executed-action-requests')
		const schema = await this.jellyfish.getViewSchema(view)
		const stream = await this.jellyfish.stream(this.session, schema)

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

		Bluebird.resolve(this.jellyfish.query(this.session, schema))
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

	async processRequest (request) {
		const data = request.data

		return Bluebird.resolve(
			this.executeAction(this.session, data.action, data.target, data.arguments)
		).then((results) => {
			debug(`Action request executed: ${request.id}`)

			return this.executeAction(this.session, 'action-update-card', request.id, {
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
			return this.executeAction(this.session, 'action-update-card', request.id, {
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

	async createRequest (userSession, options) {
		const target = await this.jellyfish.getCardById(userSession, options.targetId)

		if (!target) {
			throw new Error(`No such target: ${options.targetId}`)
		}

		const actor = await this.jellyfish.getCardById(userSession, options.actorId, {
			writeMode: true
		})

		if (!actor) {
			throw new Error(`No such actor: ${options.actorId}`)
		}

		// TODO: Ensure the user has permission to request such action
		const actionCard = await this.jellyfish.getCardBySlug(userSession, options.action, {
			writeMode: true
		})

		if (!actionCard) {
			throw new Error(`You don't have permission to execute this action: ${options.action}`)
		}

		const actionRequestCard = await this.jellyfish.getCardBySlug(this.session, 'action-request', {
			writeMode: true
		})

		if (!actionRequestCard) {
			throw new Error('No such card: action-request')
		}

		return this.executeAction(userSession, 'action-create-card', actionRequestCard.id, _.omitBy({
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

	async executeAction (userSession, actionId, targetId, args) {
		const queryOptions = {
			writeMode: true
		}

		const actionCard = await this.jellyfish.getCardBySlug(userSession, actionId)
		if (!actionCard) {
			throw new this.jellyfish.errors.JellyfishNoAction(`Unknown action: ${actionId}`)
		}

		const targetCard = await this.jellyfish.getCardById(userSession, targetId)
		if (!targetCard) {
			throw new this.jellyfish.errors.JellyfishNoElement(`Unknown target: ${targetId}`)
		}

		const cardSchema = this.jellyfish.getTypeSchema(await this.jellyfish.getCardBySlug(this.session, 'card', queryOptions))

		if (!this.jellyfish.matchesSchema(cardSchema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		if (!this.jellyfish.matchesSchema(cardSchema, targetCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid target: ${targetCard.id}`)
		}

		const actionTypeCard = await this.jellyfish.getCardBySlug(this.session, 'action', queryOptions)
		const actionSchema = this.jellyfish.getTypeSchema(actionTypeCard)

		if (!this.jellyfish.matchesSchema(actionSchema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		if (!this.jellyfish.matchesSchema(_.get(actionCard, [ 'data', 'filter' ], {
			type: 'object'
		}), targetCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch('Target does not match filter')
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

		if (!this.jellyfish.matchesSchema(argumentsSchema, computedArguments)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch('Arguments do not match')
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
			return this.executeAction(this.session, superActionSlug, targetId, compiledArguments)
		}

		const actionFunction = library[actionCard.slug]
		if (!actionFunction) {
			throw new this.jellyfish.errors.JellyfishNoAction(`Unknown action function: ${actionCard.slug}`)
		}

		debug(`Executing internal action ${actionCard.slug}`)
		return actionFunction(this.jellyfish, this, targetCard, {
			actor: await this.jellyfish.getSessionUser(this.session),
			timestamp: time.getCurrentTimestamp(),
			session: this.session
		}, compiledArguments)
	}
}

module.exports = ActionRequestWorker

module.exports.setup = async (jellyfish, session, options) => {
	const queryOptions = {
		writeMode: true
	}

	// We assume the given token should have enough permissions
	const sessionCard = await jellyfish.getCardById(session, session, queryOptions)
	if (!sessionCard) {
		throw new jellyfish.errors.JellyfishNoElement('Invalid session')
	}

	const adminWorker = new ActionRequestWorker(jellyfish, session)
	const userCard = await jellyfish.getCardBySlug(session, 'user')
	if (!userCard) {
		throw new jellyfish.errors.JellyfishNoElement('The user card does not exist')
	}

	if (!await jellyfish.getCardBySlug(session, `user-${options.username}`, queryOptions)) {
		const signupRequestId = await adminWorker.createRequest(session, {
			targetId: userCard.id,
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

		const signupRequest = await jellyfish.getCardById(session, signupRequestId, queryOptions)
		await adminWorker.processRequest(signupRequest)
	}

	const actor = await jellyfish.getCardBySlug(session, `user-${options.username}`, queryOptions)
	if (!actor) {
		throw new jellyfish.errors.JellyfishNoElement(`Unknown user: ${options.username}`)
	}

	// Remove the default user role from the new actions user
	if (_.includes(actor.data.roles, 'user-default')) {
		const updateRequestId = await adminWorker.createRequest(session, {
			targetId: actor.id,
			actorId: sessionCard.id,
			action: 'action-update-card',
			arguments: {
				// Roles can't be set to an empty array due to the way _.merge works
				// (which is used in the `action-update-card` action function)
				// https://github.com/lodash/lodash/issues/1313
				properties: {
					data: {
						roles: [ 'user-actions' ]
					}
				}
			}
		})

		const updateRequest = await jellyfish.getCardById(session, updateRequestId, queryOptions)

		await adminWorker.processRequest(updateRequest)
	}

	const loginRequestId = await adminWorker.createRequest(session, {
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

	const loginRequest = await jellyfish.getCardById(session, loginRequestId, queryOptions)
	await adminWorker.processRequest(loginRequest)
	const completedLoginRequest = await jellyfish.getCardById(session, loginRequestId, queryOptions)
	return completedLoginRequest.data.result.data
}

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
const jellyscript = require('../jellyscript')

const getActionArgumentsSchema = (actionCard) => {
	const argumentNames = _.keys(actionCard.data.arguments)
	return _.isEmpty(argumentNames)
		? {
			type: 'object'
		}
		: {
			type: 'object',
			properties: actionCard.data.arguments,
			additionalProperties: false,
			required: argumentNames
		}
}

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
			this.processRequest(this.session, request).then(() => {
				emitter.emit('request', request)
			}).catch((error) => {
				emitter.emit('error', error)
			})
		})

		return emitter
	}

	async watch () {
		const view = await this.jellyfish.getCardBySlug(this.session, 'view-non-executed-action-requests')
		const stream = await this.jellyfish.stream(this.session, view)

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

		Bluebird.resolve(this.jellyfish.query(this.session, view))
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

	async processRequest (session, request) {
		const data = request.data

		return Bluebird.resolve(this.executeAction(session, {
			actionId: data.action,
			targetId: data.target,
			actorId: data.actor
		}, data.arguments)).then((results) => {
			debug(`Action request executed: ${request.id}`)

			return this.executeAction(session, {
				actionId: 'action-update-card',
				targetId: request.id,
				actorId: data.actor
			}, {
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
			return this.executeAction(session, {
				actionId: 'action-update-card',
				targetId: request.id,
				actorId: data.actor
			}, {
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

	async createRequest (session, options) {
		let target = await this.jellyfish.getCardById(session, options.targetId)

		if (!target) {
			target = await this.jellyfish.getCardBySlug(session, options.targetId)
		}

		if (!target) {
			throw new Error(`No such target: ${options.targetId}`)
		}

		const actor = await this.jellyfish.getCardById(session, options.actorId, {
			writeMode: true
		})

		if (!actor) {
			throw new Error(`No such actor: ${options.actorId}`)
		}

		const actionCard = await this.jellyfish.getCardBySlug(session, options.action, {
			writeMode: true
		})

		if (!actionCard) {
			throw new Error(`You don't have permission to execute this action: ${options.action}`)
		}

		const actionRequestCard = await this.jellyfish.getCardBySlug(session, 'action-request', {
			writeMode: true
		})

		if (!actionRequestCard) {
			throw new Error('No such card: action-request')
		}

		const argumentsSchema = getActionArgumentsSchema(actionCard)

		return this.executeAction(session, {
			actionId: 'action-create-card',
			targetId: actionRequestCard.id,
			actorId: actor.id
		}, _.omitBy({
			properties: {
				data: {
					action: options.action,
					actor: actor.id,
					target: target.id,
					timestamp: time.getCurrentTimestamp(),
					executed: false,
					arguments: jellyscript.evaluateObject(argumentsSchema, options.arguments).object
				}
			}
		}, _.isNil))
	}

	async executeAction (session, options, args) {
		const actionCard = await this.jellyfish.getCardBySlug(session, options.actionId)
		if (!actionCard) {
			throw new this.jellyfish.errors.JellyfishNoAction(`Unknown action: ${options.actionId}`)
		}

		const targetCard = await this.jellyfish.getCardById(this.session, options.targetId)
		if (!targetCard) {
			throw new this.jellyfish.errors.JellyfishNoElement(`Unknown target: ${options.targetId}`)
		}

		const cardCard = await this.jellyfish.getCardBySlug(session, 'card')

		if (!this.jellyfish.matchesSchema(cardCard.data.schema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		if (!this.jellyfish.matchesSchema(cardCard.data.schema, targetCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid target: ${targetCard.id}`)
		}

		const actionTypeCard = await this.jellyfish.getCardBySlug(session, 'action')

		if (!this.jellyfish.matchesSchema(actionTypeCard.data.schema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		if (!this.jellyfish.matchesSchema(_.get(actionCard, [ 'data', 'filter' ], {
			type: 'object'
		}), targetCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch('Target does not match filter')
		}

		const argumentsSchema = getActionArgumentsSchema(actionCard)
		if (!this.jellyfish.matchesSchema(argumentsSchema, args)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch('Arguments do not match')
		}

		const compiledArguments = objectTemplate.compile(actionCard.data.options, {
			arguments: args
		}, {
			delimiters: [ '\\[', '\\]' ]
		})

		// Support for actions that extend other actions

		const superActionSlug = _.get(actionCard, [ 'data', 'extends' ], null)
		if (superActionSlug) {
			debug(`Executing super action ${superActionSlug}`)
			return this.executeAction(session, {
				actionId: superActionSlug,
				targetId: options.targetId,
				actorId: options.actorId
			}, compiledArguments)
		}

		const actionFunction = library[actionCard.slug]
		if (!actionFunction) {
			throw new this.jellyfish.errors.JellyfishNoAction(`Unknown action function: ${actionCard.slug}`)
		}

		if (!await this.jellyfish.getCardById(session, options.actorId)) {
			throw new this.jellyfish.errors.JellyfishNoElement(`Unknown actor: ${options.actorId}`)
		}

		debug(`Executing internal action ${actionCard.slug}`)
		return actionFunction(this.jellyfish, this, targetCard, {
			timestamp: time.getCurrentTimestamp(),
			actor: options.actorId,
			session
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
			arguments: {
				email: options.email,
				username: `user-${options.username}`,
				hash: {
					string: options.password,
					salt: `user-${options.username}`
				}
			}
		})

		const signupRequest = await jellyfish.getCardById(session, signupRequestId, queryOptions)
		await adminWorker.processRequest(session, signupRequest)
	}

	const actor = await jellyfish.getCardBySlug(session, `user-${options.username}`, queryOptions)
	if (!actor) {
		throw new jellyfish.errors.JellyfishNoElement(`Unknown user: ${options.username}`)
	}

	// Set the role for the actions user, as it requires a high level of privilege
	if (!_.isEmpty(actor.data.roles)) {
		const updateRequestId = await adminWorker.createRequest(session, {
			targetId: actor.id,
			actorId: sessionCard.id,
			action: 'action-update-card',
			arguments: {
				properties: {
					data: {
						roles: []
					}
				}
			}
		})

		const updateRequest = await jellyfish.getCardById(session, updateRequestId, queryOptions)
		await adminWorker.processRequest(session, updateRequest)
	}

	const loginRequestId = await adminWorker.createRequest(session, {
		targetId: actor.id,
		actorId: sessionCard.id,
		action: 'action-create-session',
		arguments: {
			password: {
				hash: {
					string: options.password,
					salt: actor.slug
				}
			}
		}
	})

	const loginRequest = await jellyfish.getCardById(session, loginRequestId, queryOptions)
	await adminWorker.processRequest(session, loginRequest)
	const completedLoginRequest = await jellyfish.getCardById(session, loginRequestId, queryOptions)
	return completedLoginRequest.data.result.data
}

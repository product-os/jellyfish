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

const VIEW_ACTIVE_TRIGGERS = 'view-active-triggered-actions'

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

const VIEW_PENDING_REQUESTS = 'view-non-executed-action-requests'

class ActionRequestWorker {
	constructor (jellyfish, session) {
		this.jellyfish = jellyfish
		this.session = session
		this.triggers = []
	}

	async reloadTriggers () {
		const view = await this.jellyfish.getCardBySlug(this.session, VIEW_ACTIVE_TRIGGERS, {
			type: 'view'
		})

		if (!view) {
			throw new Error(`Cannot execute triggers: no such card ${VIEW_ACTIVE_TRIGGERS}`)
		}

		this.triggers = await this.jellyfish.query(this.session, view)
	}

	async getActorKey (actorId) {
		const keySlug = `session-action-${actorId}`
		const key = await this.jellyfish.getCardBySlug(this.session, keySlug, {
			type: 'session'
		})

		if (key && key.data.actor === actorId) {
			return key.id
		}

		return this.jellyfish.insertCard(this.session, {
			slug: keySlug,
			type: 'session',
			active: true,
			links: [],
			tags: [],
			data: {
				actor: actorId
			}
		}, {
			override: true
		})
	}

	async start () {
		this.reloadTriggers()
		const emitter = new EventEmitter()
		const triggersWatcher = await this.watchTriggers()
		const requestWatcher = await this.watchRequests()

		requestWatcher.on('started', () => {
			emitter.emit('started')
		})

		requestWatcher.on('error', (error) => {
			emitter.emit('error', error)
		})

		triggersWatcher.on('error', (error) => {
			emitter.emit('error', error)
		})

		requestWatcher.on('request', (request) => {
			return this.getActorKey(request.data.actor).then((key) => {
				return this.processRequest(key, request).then(() => {
					emitter.emit('request', request)
				})
			}).catch((error) => {
				emitter.emit('error', error)
			})
		})

		emitter.stop = () => {
			return Bluebird.all([
				new Bluebird((resolve) => {
					requestWatcher.once('closed', resolve)
					requestWatcher.close()
				}),
				new Bluebird((resolve) => {
					triggersWatcher.once('closed', resolve)
					triggersWatcher.close()
				})
			])
		}

		return emitter
	}

	async getPendingRequests (session) {
		const view = await this.jellyfish.getCardBySlug(session, VIEW_PENDING_REQUESTS, {
			type: 'view'
		})

		if (!view) {
			throw new Error(`Cannot initialise actions watcher: no such card ${VIEW_PENDING_REQUESTS}`)
		}

		return this.jellyfish.query(session, view)
	}

	async watchRequests () {
		const view = await this.jellyfish.getCardBySlug(this.session, 'view-non-executed-action-requests', {
			type: 'view'
		})

		if (!view) {
			throw new Error('Cannot initialise actions watcher: no such card view-non-executed-action-requests')
		}

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

		Bluebird.resolve(this.getPendingRequests(this.session))
			.tap(() => {
				emitter.emit('started')
			})
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

	async watchTriggers () {
		const view = await this.jellyfish.getCardBySlug(this.session, VIEW_ACTIVE_TRIGGERS, {
			type: 'view'
		})

		if (!view) {
			throw new Error(`Cannot execute triggers: no such card ${VIEW_ACTIVE_TRIGGERS}`)
		}

		const stream = await this.jellyfish.stream(this.session, view)
		const emitter = new EventEmitter()
		emitter.close = stream.close

		stream.on('error', (error) => {
			emitter.emit('error', error)
		})

		stream.on('closed', () => {
			emitter.emit('closed')
		})

		stream.on('data', () => {
			this.reloadTriggers()
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
			type: 'action',
			writeMode: true
		})

		if (!actionCard) {
			throw new Error(`You don't have permission to execute this action: ${options.action}`)
		}

		const actionRequestCard = await this.jellyfish.getCardBySlug(session, 'action-request', {
			type: 'type',
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

	async executeTriggers (session, card) {
		const expandedCard = _.cloneDeep(card)
		if (_.has(card, [ 'data', 'target' ])) {
			expandedCard.data.target =
				await this.jellyfish.getCardById(this.session, card.data.target)
		}

		const sessionCard = await this.jellyfish.getCardById(session, session, {
			type: 'session'
		})

		if (!sessionCard) {
			throw new this.jellyfish.errors.JellyfishNoElement('Invalid session')
		}

		const requests = await Bluebird.map(this.triggers, (trigger) => {
			const compiledTrigger = _.attempt(objectTemplate.compile, trigger.data, {
				source: card
			}, {
				delimiters: [ '\\{', '\\}' ]
			})

			if (_.isError(compiledTrigger) || !this.jellyfish.matchesSchema(compiledTrigger.filter, expandedCard)) {
				return null
			}

			debug(`Executing trigger: ${trigger.id}`)
			return this.createRequest(session, {
				targetId: compiledTrigger.target,
				actorId: sessionCard.data.actor,
				action: compiledTrigger.action,
				arguments: compiledTrigger.arguments
			})
		}, {
			concurrency: 3
		})

		return _.compact(requests)
	}

	async executeAction (session, options, args) {
		const actionCard = await this.jellyfish.getCardBySlug(session, options.actionId, {
			type: 'action'
		})

		if (!actionCard) {
			throw new this.jellyfish.errors.JellyfishNoAction(`Unknown action: ${options.actionId}`)
		}

		const targetCard = await this.jellyfish.getCardById(this.session, options.targetId)
		if (!targetCard) {
			throw new this.jellyfish.errors.JellyfishNoElement(`Unknown target: ${options.targetId}`)
		}

		const cardCard = await this.jellyfish.getCardBySlug(session, 'card', {
			type: 'type'
		})

		if (!this.jellyfish.matchesSchema(cardCard.data.schema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		if (!this.jellyfish.matchesSchema(cardCard.data.schema, targetCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid target: ${targetCard.id}`)
		}

		const actionTypeCard = await this.jellyfish.getCardBySlug(session, 'action', {
			type: 'type'
		})

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
	// We assume the given token should have enough permissions
	const sessionCard = await jellyfish.getCardById(session, session, {
		type: 'session',
		writeMode: true
	})

	if (!sessionCard) {
		throw new jellyfish.errors.JellyfishNoElement('Invalid session')
	}

	const adminWorker = new ActionRequestWorker(jellyfish, session)
	const userCard = await jellyfish.getCardBySlug(session, 'user', {
		type: 'type'
	})

	if (!userCard) {
		throw new jellyfish.errors.JellyfishNoElement('The user card does not exist')
	}

	if (!await jellyfish.getCardBySlug(session, `user-${options.username}`, {
		type: 'user',
		writeMode: true
	})) {
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

		const signupRequest = await jellyfish.getCardById(session, signupRequestId, {
			type: 'action-request',
			writeMode: true
		})

		await adminWorker.processRequest(session, signupRequest)
	}

	const actor = await jellyfish.getCardBySlug(session, `user-${options.username}`, {
		type: 'user',
		writeMode: true
	})

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

		const updateRequest = await jellyfish.getCardById(session, updateRequestId, {
			type: 'action-request',
			writeMode: true
		})

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

	const loginRequest = await jellyfish.getCardById(session, loginRequestId, {
		type: 'action-request',
		writeMode: true
	})

	await adminWorker.processRequest(session, loginRequest)
	const completedLoginRequest = await jellyfish.getCardById(session, loginRequestId, {
		type: 'action-request',
		writeMode: true
	})

	return completedLoginRequest.data.result.data
}

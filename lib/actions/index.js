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
const skhema = require('skhema')
const library = require('./library')
const time = require('./time')
const Orchestrator = require('./orchestrator')
const utils = require('./utils')

class ActionRequestWorker {
	constructor (jellyfish, session) {
		this.orchestrator = new Orchestrator(jellyfish, session)
		this.jellyfish = jellyfish
		this.session = session
	}

	async refreshTriggers () {
		return this.orchestrator.refreshTriggers()
	}

	async getActorKey (actorId) {
		const keySlug = `session-action-${actorId}`
		const key = await this.jellyfish.getCardBySlug(this.session, keySlug, {
			type: 'session'
		})

		if (key && key.data.actor === actorId) {
			return key
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
		const emitter = new EventEmitter()

		this.orchestrator.on('started', () => {
			emitter.emit('started')
		})

		this.orchestrator.on('error', (error) => {
			emitter.emit('error', error)
		})

		this.orchestrator.on('request', (request) => {
			debug(`Incoming action request ${request.id} (${request.data.action})`)
			return this.getActorKey(request.data.actor).then((key) => {
				return this.processRequest(key.id, request).then(() => {
					emitter.emit('request', request)
				})
			}).catch((error) => {
				emitter.emit('error', error)
			})
		})

		emitter.stop = () => {
			return this.orchestrator.stop()
		}

		await this.orchestrator.start()

		return emitter
	}

	async getPendingRequests () {
		return this.orchestrator.getPendingRequests()
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
		}).tap(() => {
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

		return this.orchestrator.createRequest(session, options.action, {
			targetId: target.id,
			actorId: actor.id,
			arguments: options.arguments
		})
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

		const requests = await Bluebird.map(this.orchestrator.getTriggeredActionCards(), (trigger) => {
			const compiledTrigger = _.attempt(objectTemplate.compile, trigger.data, {
				source: card
			}, {
				delimiters: [ '\\{', '\\}' ]
			})

			if (_.isError(compiledTrigger) || !skhema.isValid(compiledTrigger.filter, expandedCard)) {
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

		const targetCard = await this.jellyfish.getCardById(session, options.targetId)
		if (!targetCard) {
			throw new this.jellyfish.errors.JellyfishNoElement(`Unknown target: ${options.targetId}`)
		}

		const cardCard = await this.jellyfish.getCardBySlug(session, 'card', {
			type: 'type'
		})

		if (!skhema.isValid(cardCard.data.schema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		const actionTypeCard = await this.jellyfish.getCardBySlug(session, 'action', {
			type: 'type'
		})

		if (!skhema.isValid(actionTypeCard.data.schema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		if (!skhema.isValid(_.get(actionCard, [ 'data', 'filter' ], {
			type: 'object'
		}), targetCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch('Target does not match filter')
		}

		const argumentsSchema = utils.getActionArgumentsSchema(actionCard)
		if (!skhema.isValid(argumentsSchema, args)) {
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
		const signupRequest = await adminWorker.createRequest(session, {
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
		const updateRequest = await adminWorker.createRequest(session, {
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

		await adminWorker.processRequest(session, updateRequest)
	}

	const loginRequest = await adminWorker.createRequest(session, {
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

	const completedLoginRequest = await adminWorker.processRequest(session, loginRequest)
	return completedLoginRequest.data.result.data
}

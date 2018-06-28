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
const jellyscript = require('../jellyscript')

const slugify = (string) => {
	return string
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

class ActionRequestWorker {
	constructor (jellyfish, session) {
		this.orchestrator = new Orchestrator(jellyfish, session)
		this.jellyfish = jellyfish
		this.session = session
		this.typeCards = {}
	}

	async getCardBySlug (session, slug) {
		return this.jellyfish.getCardBySlug(session, slug)
	}

	async getCardById (session, id) {
		return this.jellyfish.getCardById(session, id)
	}

	// TODO: Rename card to "type"
	async insertCard (session, typeCard, options, object) {
		const queryOptions = {
			writeMode: true
		}

		let hasCard = false

		if (object.id && await this.jellyfish.getCardById(session, object.id, queryOptions)) {
			hasCard = true
		}

		if (object.slug && await this.jellyfish.getCardBySlug(session, object.slug, queryOptions)) {
			hasCard = true
		}

		const properties = _.omitBy({
			id: object.id,
			slug: object.slug,
			name: object.name,
			active: _.isNil(object.active) ? true : object.active,
			tags: object.tags || [],
			type: typeCard.slug,
			links: object.links || [],
			data: object.data || {}
		}, _.isNil)

		const typeSchema = _.get(typeCard, [ 'data', 'schema' ], null)
		if (!typeSchema) {
			throw new this.jellyfish.errors.JellyfishUnknownCardType(`Unknown type: ${properties.type}`)
		}

		const result = jellyscript.evaluateObject(typeSchema, properties)

		if (properties.type === 'type') {
			const triggers = await this.jellyfish.query(this.session, {
				type: 'object',
				required: [ 'id', 'active', 'type', 'data' ],
				properties: {
					id: {
						type: 'string'
					},
					slug: {
						type: 'string'
					},
					active: {
						type: 'boolean',
						const: true
					},
					type: {
						type: 'string',
						const: 'triggered-action'
					},
					data: {
						type: 'object',
						required: [ 'type' ],
						properties: {
							type: {
								type: 'string',
								const: properties.slug
							}
						}
					}
				}
			})

			for (const trigger of triggers) {
				await this.executeAction(this.session, {
					actionId: 'action-delete-card',
					targetId: trigger.id,
					actorId: options.actor
				}, {})
			}
		}

		const insertedCard = await this.jellyfish.insertCard(session, result.object, {
			override: options.override
		})

		if (options.events && result.object.data.action !== 'action-create-event') {
			if (options.override && hasCard) {
				await this.createRequest(session, {
					action: 'action-create-event',
					targetId: insertedCard.id,
					actorId: options.actor,
					arguments: {
						type: 'update',
						payload: _.omit(result.object, [ 'type', 'id' ])
					}
				})
			} else {
				await this.createRequest(session, {
					action: 'action-create-event',
					targetId: insertedCard.id,
					actorId: options.actor,
					arguments: {
						type: 'create',
						payload: {}
					}
				})
			}
		}

		// TODO: Generalize and refactor this on top of triggered actions
		for (const watcher of result.watchers) {
			if (watcher.type === 'AGGREGATE') {
				const triggeredActionSlug = 'triggered-action'
				const triggeredActionTypeCard = await this.jellyfish.getCardBySlug(session, triggeredActionSlug, {
					type: 'type',
					writeMode: true
				})

				if (!triggeredActionTypeCard) {
					throw new this.jellyfish.errors.JellyfishNoElement(`No such type: ${triggeredActionSlug}`)
				}

				const targetProperty = _.join(_.concat([ 'source' ], watcher.target), '.')
				const valueProperty = _.join([ 'source', watcher.arguments[0] ], '.')
				const actionSlug = 'action-set-add'

				await this.insertCard(session, triggeredActionTypeCard, {
					timestamp: options.timestamp,
					actor: options.actor,
					override: true
				}, {
					slug: slugify(`${triggeredActionSlug}-${properties.type}-${actionSlug}-${watcher.sourceProperty.join('-')}`),
					data: {
						type: properties.type,
						filter: watcher.filter,
						action: actionSlug,
						target: `{${targetProperty}}`,
						arguments: {
							property: _.join(watcher.sourceProperty, '.'),
							value: `{${valueProperty}}`
						}
					}
				})
			}
		}

		await this.executeTriggers(session, insertedCard)
		return insertedCard
	}

	async refreshTypeCards () {
		this.typeCards.card = await this.jellyfish.getCardBySlug(this.session, 'card', {
			type: 'type'
		})

		if (!this.typeCards.card) {
			throw new Error('There is no card type: card')
		}

		this.typeCards.action = await this.jellyfish.getCardBySlug(this.session, 'action', {
			type: 'type'
		})

		if (!this.typeCards.action) {
			throw new Error('There is no card type: action')
		}
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

	async start (options = {}) {
		const emitter = new EventEmitter()
		this.refreshTypeCards()

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

		await this.orchestrator.start()
		return emitter
	}

	async stop () {
		await this.flushPendingRequests()
		return this.orchestrator.stop()
	}

	async flushPendingRequests () {
		const pendingRequests = await this.getPendingRequests()
		if (pendingRequests.length === 0) {
			return Bluebird.resolve()
		}

		for (const request of pendingRequests) {
			const key = await this.getActorKey(request.data.actor)
			await this.processRequest(key.id, request)
		}

		return this.flushPendingRequests()
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
							data: {
								type: error.name,
								message: error.message
							}
						}
					}
				}
			})
		}).tap(() => {
			debug(`Action request results set: ${request.id}`)
		})
	}

	async createRequest (session, options) {
		return this.orchestrator.createRequest(session, options.action, {
			targetId: options.targetId,
			actorId: options.actorId,
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

		let targetCard = await this.jellyfish.getCardById(session, options.targetId)
		if (!targetCard) {
			targetCard = await this.jellyfish.getCardBySlug(session, options.targetId)
		}
		if (!targetCard) {
			throw new this.jellyfish.errors.JellyfishNoElement(`Unknown target: ${options.targetId}`)
		}

		const actor = await this.jellyfish.getCardById(session, options.actorId)
		if (!actor) {
			throw new Error(`No such actor: ${options.actorId}`)
		}

		if (!this.typeCards.card || !this.typeCards.action) {
			await this.refreshTypeCards()
		}

		if (!skhema.isValid(this.typeCards.card.data.schema, actionCard)) {
			throw new this.jellyfish.errors.JellyfishSchemaMismatch(`Invalid action: ${actionCard.id}`)
		}

		if (!skhema.isValid(this.typeCards.action.data.schema, actionCard)) {
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
		return actionFunction(session, this, targetCard, {
			timestamp: time.getCurrentTimestamp(),
			actor: options.actorId
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
			actorId: sessionCard.data.actor,
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
			actorId: sessionCard.data.actor,
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
		actorId: sessionCard.data.actor,
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

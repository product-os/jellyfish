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
const utils = require('./utils')
const errors = require('./errors')
const jellyscript = require('../jellyscript')

// Add custom formats to skhema
skhema.addFormat('markdown', _.isString)
skhema.addFormat('mermaid', _.isString)

const TYPE_ACTION_REQUEST = 'action-request'

const SCHEMA_ACTIVE_TRIGGERS = {
	type: 'object',
	properties: {
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
			additionalProperties: true
		}
	},
	required: [ 'active', 'type', 'data' ]
}

const SCHEMA_PENDING_REQUESTS = {
	type: 'object',
	required: [ 'id', 'active', 'type', 'data' ],
	properties: {
		id: {
			type: 'string'
		},
		active: {
			type: 'boolean',
			const: true
		},
		type: {
			type: 'string',
			const: TYPE_ACTION_REQUEST
		},
		data: {
			type: 'object',
			required: [ 'action', 'actor', 'target', 'executed', 'arguments' ],
			properties: {
				action: {
					type: 'string'
				},
				actor: {
					type: 'string'
				},
				target: {
					type: 'string'
				},
				executed: {
					type: 'boolean',
					const: false
				},
				arguments: {
					type: 'object',
					additionalProperties: true
				}
			}
		}
	}
}

const closeStream = (streams, name) => {
	if (!streams[name]) {
		return Bluebird.resolve()
	}

	return new Bluebird((resolve) => {
		streams[name].once('closed', () => {
			Reflect.deleteProperty(streams, name)
			resolve()
		})

		streams[name].close()
	})
}

const slugify = (string) => {
	return string
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

const flushPendingRequests = async (worker, jellyfish) => {
	const pendingRequests = await worker.getPendingRequests()
	if (pendingRequests.length === 0) {
		return Bluebird.resolve()
	}

	for (const request of pendingRequests) {
		const key = await getActorKey(jellyfish, worker.session, request.data.actor)
		await processRequest(worker, key.id, request)
	}

	return flushPendingRequests(worker, jellyfish)
}

const executeTriggers = async (session, worker, jellyfish, card) => {
	const expandedCard = _.cloneDeep(card)
	if (_.has(card, [ 'data', 'target' ])) {
		expandedCard.data.target =
			await jellyfish.getCardById(worker.session, card.data.target)
	}

	const sessionCard = await jellyfish.getCardById(session, session, {
		type: 'session'
	})

	if (!sessionCard) {
		throw new errors.ActionsNoElement('Invalid session')
	}

	const requests = await Bluebird.map(worker.triggers, (trigger) => {
		const compiledTrigger = _.attempt(objectTemplate.compile, trigger.data, {
			source: card
		}, {
			delimiters: [ '\\{', '\\}' ]
		})

		if (_.isError(compiledTrigger) || !skhema.isValid(compiledTrigger.filter, expandedCard)) {
			return null
		}

		debug(`Executing trigger: ${trigger.id}`)
		return worker.createRequest(session, {
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

const executeAction = async (session, worker, jellyfish, options, args) => {
	const actionCard = await jellyfish.getCardBySlug(session, options.actionId, {
		type: 'action'
	})

	if (!actionCard) {
		throw new errors.ActionsNoElement(`Unknown action: ${options.actionId}`)
	}

	let targetCard = await jellyfish.getCardById(session, options.targetId)
	if (!targetCard) {
		targetCard = await jellyfish.getCardBySlug(session, options.targetId)
	}
	if (!targetCard) {
		throw new errors.ActionsNoElement(`Unknown target: ${options.targetId}`)
	}

	const actor = await jellyfish.getCardById(session, options.actorId)
	if (!actor) {
		throw new Error(`No such actor: ${options.actorId}`)
	}

	if (!worker.typeCards.card || !worker.typeCards.action) {
		await refreshTypeCards(jellyfish, worker)
	}

	if (!skhema.isValid(worker.typeCards.card.data.schema, actionCard)) {
		throw new errors.ActionsSchemaMismatch(`Invalid action: ${actionCard.id}`)
	}

	if (!skhema.isValid(worker.typeCards.action.data.schema, actionCard)) {
		throw new errors.ActionsSchemaMismatch(`Invalid action: ${actionCard.id}`)
	}

	if (!skhema.isValid(_.get(actionCard, [ 'data', 'filter' ], {
		type: 'object'
	}), targetCard)) {
		throw new errors.ActionsSchemaMismatch('Target does not match filter')
	}

	const argumentsSchema = utils.getActionArgumentsSchema(actionCard)
	if (!skhema.isValid(argumentsSchema, args)) {
		throw new errors.ActionsSchemaMismatch('Arguments do not match')
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
		return executeAction(session, worker, jellyfish, {
			actionId: superActionSlug,
			targetId: options.targetId,
			actorId: options.actorId
		}, compiledArguments)
	}

	const actionFunction = library[actionCard.slug]
	if (!actionFunction) {
		throw new errors.ActionsNoElement(`Unknown action function: ${actionCard.slug}`)
	}

	if (!await jellyfish.getCardById(session, options.actorId)) {
		throw new errors.ActionsNoElement(`Unknown actor: ${options.actorId}`)
	}

	debug(`Executing internal action ${actionCard.slug}`)
	return actionFunction(session, worker, targetCard, {
		timestamp: time.getCurrentTimestamp(),
		actor: options.actorId
	}, compiledArguments)
}

const processRequest = (worker, session, request) => {
	const data = request.data

	return Bluebird.resolve(executeAction(session, worker, worker.jellyfish, {
		actionId: data.action,
		targetId: data.target,
		actorId: data.actor
	}, data.arguments)).then((results) => {
		debug(`Action request executed: ${request.id}`)

		return executeAction(session, worker, worker.jellyfish, {
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
		return executeAction(session, worker, worker.jellyfish, {
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

const refreshTypeCards = async (jellyfish, worker) => {
	worker.typeCards.card = await jellyfish.getCardBySlug(worker.session, 'card', {
		type: 'type'
	})

	if (!worker.typeCards.card) {
		throw new Error('There is no card type: card')
	}

	worker.typeCards.action = await jellyfish.getCardBySlug(worker.session, 'action', {
		type: 'type'
	})

	if (!worker.typeCards.action) {
		throw new Error('There is no card type: action')
	}
}

const refreshTriggers = async (worker, jellyfish) => {
	worker.triggers =
		await jellyfish.query(worker.session, SCHEMA_ACTIVE_TRIGGERS)
}

const getActorKey = async (jellyfish, session, actorId) => {
	const keySlug = `session-action-${actorId}`
	const key = await jellyfish.getCardBySlug(session, keySlug, {
		type: 'session'
	})

	if (key && key.data.actor === actorId) {
		return key
	}

	return jellyfish.insertCard(session, {
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

class ActionRequestWorker {
	constructor (jellyfish, session) {
		this.jellyfish = jellyfish
		this.session = session
		this.typeCards = {}
		this.triggers = []
		this.streams = {}
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
			throw new errors.ActionsNoElement(`Unknown type: ${properties.type}`)
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
				await executeAction(this.session, this, this.jellyfish, {
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
					throw new errors.ActionsNoElement(`No such type: ${triggeredActionSlug}`)
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

		await executeTriggers(session, this, this.jellyfish, insertedCard)
		return insertedCard
	}

	async start (options = {}) {
		await this.stop()
		await refreshTriggers(this, this.jellyfish)
		await refreshTypeCards(this.jellyfish, this)

		const emitter = new EventEmitter()

		this.streams.triggers =
			await this.jellyfish.stream(this.session, SCHEMA_ACTIVE_TRIGGERS)
		this.streams.triggers.on('data', () => {
			refreshTriggers(this, this.jellyfish).catch((error) => {
				emitter.emit('error', error)
			})
		})

		this.streams.triggers.on('error', (error) => {
			emitter.emit('error', error)
		})

		this.streams.pendingRequests =
			await this.jellyfish.stream(this.session, SCHEMA_PENDING_REQUESTS)
		this.streams.pendingRequests.on('error', (error) => {
			emitter.emit('error', error)
		})

		this.streams.pendingRequests.on('data', (change) => {
			emitter.emit('pending-request', change.after)
		})

		Bluebird.resolve(this.getPendingRequests()).each((request) => {
			emitter.emit('pending-request', request)
		}).catch((error) => {
			emitter.emit('error', error)
		})

		emitter.on('pending-request', (request) => {
			debug(`Incoming action request ${request.id} (${request.data.action})`)
			return getActorKey(this.jellyfish, this.session, request.data.actor).then((key) => {
				return processRequest(this, key.id, request).then(() => {
					emitter.emit('request', request)
				})
			}).catch((error) => {
				emitter.emit('error', error)
			})
		})

		return emitter
	}

	async stop () {
		await flushPendingRequests(this, this.jellyfish)
		return Bluebird.all([
			closeStream(this.streams, 'triggers'),
			closeStream(this.streams, 'pendingRequests')
		])
	}

	async getPendingRequests () {
		return this.jellyfish.query(this.session, SCHEMA_PENDING_REQUESTS)
	}

	async createRequest (session, options) {
		const actionCard = await this.jellyfish.getCardBySlug(session, options.action, {
			type: 'action',
			writeMode: true
		})

		if (!actionCard) {
			throw new errors.ActionsNoElement(`You don't have permission to execute this action: ${options.action}`)
		}

		return this.jellyfish.insertCard(session, {
			type: TYPE_ACTION_REQUEST,
			active: true,
			links: [],
			tags: [],
			data: {
				action: actionCard.slug,

				// Anyone is free to create an action request
				// matching to anything they like. Whether they
				// can access these cards is something that must
				// be checked right before actually executing the
				// action, otherwise if all the checks are here,
				// then someone can circunvent them all by creating
				// a request directly on the core server, which
				// won't perform any checks.
				actor: options.actorId,
				target: options.targetId,

				timestamp: time.getCurrentTimestamp(),
				executed: false,
				arguments: jellyscript.evaluateObject(
					utils.getActionArgumentsSchema(actionCard),
					options.arguments
				).object
			}
		})
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
		throw new errors.ActionsNoElement('Invalid session')
	}

	const adminWorker = new ActionRequestWorker(jellyfish, session)
	const userCard = await jellyfish.getCardBySlug(session, 'user', {
		type: 'type'
	})

	if (!userCard) {
		throw new errors.ActionsNoElement('The user card does not exist')
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

		await processRequest(adminWorker, session, signupRequest)
	}

	const actor = await jellyfish.getCardBySlug(session, `user-${options.username}`, {
		type: 'user',
		writeMode: true
	})

	if (!actor) {
		throw new errors.ActionsNoElement(`Unknown user: ${options.username}`)
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

		await processRequest(adminWorker, session, updateRequest)
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

	const completedLoginRequest = await processRequest(adminWorker, session, loginRequest)
	return completedLoginRequest.data.result.data
}

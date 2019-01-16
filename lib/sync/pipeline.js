/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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

const _ = require('lodash')
const Bluebird = require('bluebird')
const jsone = require('json-e')
const errors = require('./errors')

const runIntegration = async (integration, options, fn, card) => {
	// eslint-disable-next-line new-cap
	const instance = new integration({
		// Notice that integrations don't have access at all
		// to functions that insert/upsert to the data store
		context: {
			log: options.context.log,
			getElementBySlug: options.context.getElementBySlug,
			getElementById: options.context.getElementById,
			getActorId: options.context.getActorId,
			getElementByMirrorId: options.context.getElementByMirrorId
		},

		token: options.token
	})

	await instance.initialize()

	try {
		const sequence = await instance[fn](card, {
			actor: options.actor
		})

		options.context.log.debug('Processing pipeline sequence', {
			type: fn,
			sequence
		})

		const result = await exports.importCards(options.context, sequence, {
			origin: card
		})

		await instance.destroy()
		return result
	} catch (error) {
		await instance.destroy()
		throw error
	}
}

/**
 * @summary Evaluate an object template
 * @function
 * @private
 *
 * @param {Object} object - object
 * @param {Object} environment - evaluation context
 * @returns {(Object|Null)} evaluated object
 *
 * @example
 * const result = evaluateObject({
 *   foo: {
 *     $eval: 'hello'
 *   }
 * }, {
 *   hello: 1
 * })
 *
 * console.log(result)
 * > {
 * >   foo: 1
 * > }
 */
const evaluateObject = (object, environment) => {
	try {
		return jsone(object, environment)
	} catch (error) {
		if (error.name === 'InterpreterError') {
			return null
		}

		throw error
	}
}

/**
 * @summary Import a sequence of cards
 * @function
 * @public
 *
 * @param {Object} context - worker execution context
 * @param {Array} sequence - card sequence
 * @param {Object} options - options
 * @param {String} options.origin - origin id
 * @returns {Object[]} inserted cards
 *
 * @example
 * const result = await pipeline.importCards({ ... }, [
 *   {
 *     time: new Date(),
 *     card: { ... }
 *   },
 *   {
 *     time: new Date(),
 *     card: { ... }
 *   },
 *   {
 *     time: new Date(),
 *     card: { ... }
 *   }
 * ], {
 *   origin: 'e9b74e2a-3553-4188-8ab8-a67e92aedbe2'
 * })
 */
exports.importCards = async (context, sequence, options = {}) => {
	const references = options.references || {}
	const insertedCards = []

	for (const [ index, value ] of sequence.entries()) {
		const step = _.castArray(value)
		await Bluebird.map(step, async (segment, subindex, length) => {
			const path = [ 'cards', index ]
			if (length !== 1) {
				path.push(subindex)
			}

			const object = evaluateObject(_.omit(segment.card, [ 'links' ]), references)
			if (!object) {
				throw new errors.SyncInvalidTemplate(
					`Could not evaluate template in: ${JSON.stringify(segment.card, null, 2)}`)
			}

			const finalObject = Object.assign({
				active: true,
				version: '1.0.0',
				tags: [],
				markers: [],
				links: {},
				requires: [],
				capabilities: [],
				data: {}
			}, object)

			if (options.origin) {
				finalObject.data.origin = options.origin.slug
			}

			if (!segment.actor) {
				throw new errors.SyncNoActor(`No actor in segment: ${JSON.stringify(segment)}`)
			}

			const result = await context.upsertElement(object.type, finalObject, {
				timestamp: segment.time,
				actor: segment.actor
			})

			insertedCards.push(result)
			_.set(references, path, result)
		}, {
			concurrency: 3
		})
	}

	return insertedCards
}

/**
 * @summary Translate an external event
 * @function
 * @public
 *
 * @param {Object} integration - integration class
 * @param {Object} externalEvent - external event card
 * @param {Object} options - options
 * @param {Object} options.context - execution context
 * @returns {Object[]} inserted cards
 *
 * @example
 * const cards = await pipeline.translateExternalEvent(MyIntegration, {
 *   type: 'external-event',
 *   ...
 * }, {
 *   context: { ... }
 * })
 */
exports.translateExternalEvent = async (integration, externalEvent, options) => {
	return runIntegration(integration, options, 'translate', externalEvent)
}

/**
 * @summary Mirror a card back
 * @function
 * @public
 *
 * @param {Object} integration - integration class
 * @param {Object} card - local card
 * @param {Object} options - options
 * @param {Object} options.context - execution context
 * @param {String} options.actor - actor id
 * @returns {Object[]} inserted cards
 *
 * @example
 * const cards = await pipeline.mirrorCard(MyIntegration, {
 *   type: 'card',
 *   ...
 * }, {
 *   context: { ... },
 *   actor: 'b76a4589-cac6-4293-b448-0440b5c66498'
 * })
 */
exports.mirrorCard = async (integration, card, options) => {
	return runIntegration(integration, options, 'mirror', card)
}

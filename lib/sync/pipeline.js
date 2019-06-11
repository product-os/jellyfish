/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const jsone = require('json-e')
const errors = require('./errors')
const instance = require('./instance')
const assert = require('../assert')

const runIntegration = async (integration, options, fn, card) => {
	return instance.run(integration, options.token, async (integrationInstance) => {
		const sequence = await integrationInstance[fn](card, {
			actor: options.actor
		})

		options.context.log.debug('Processing pipeline sequence', {
			type: fn,
			sequence
		})

		return exports.importCards(options.context, sequence, {
			origin: card
		})
	}, {
		actor: options.actor,
		origin: options.origin,
		defaultUser: options.defaultUser,
		provider: options.provider,
		context: options.context
	})
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
	if (!object) {
		return object
	}

	if (object.$eval) {
		try {
			return jsone(object, environment)
		} catch (error) {
			if (error.name === 'InterpreterError') {
				return null
			}

			throw error
		}
	}

	for (const key of Object.keys(object)) {
		// For performance reasons
		// eslint-disable-next-line lodash/prefer-lodash-typecheck
		if (typeof object[key] !== 'object' || object[key] === null) {
			continue
		}

		const result = evaluateObject(object[key], environment)
		if (!result) {
			return null
		}

		object[key] = result
	}

	return object
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
			assert.INTERNAL(context, object, errors.SyncInvalidTemplate,
				`Could not evaluate template in: ${JSON.stringify(segment.card, null, 2)}`)

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

			if (options.origin && options.origin.type === 'external-event') {
				finalObject.data.origin = options.origin.slug
			}

			assert.INTERNAL(context, segment.actor, errors.SyncNoActor,
				`No actor in segment: ${JSON.stringify(segment)}`)

			const result = await context.upsertElement(object.type, finalObject, {
				timestamp: segment.time,
				actor: segment.actor,
				originator: _.get(options, [ 'origin', 'id' ])
			})

			if (result) {
				insertedCards.push(result)
			}

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

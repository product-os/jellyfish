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
 * @param {String} session - jellyfish session
 * @param {Array} sequence - card sequence
 * @param {Object} options - options
 * @param {String} options.actor - actor id
 * @returns {Object[]} inserted cards
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const result = await sync.importCards({ ... }, session, [
 *   { ... },
 *   { ... },
 *   { ... }
 * ], {
 *   actor: 'e9b74e2a-3553-4188-8ab8-a67e92aedbe2'
 * })
 */
exports.importCards = async (context, session, sequence, options) => {
	const references = options.references || {}
	const insertedCards = []

	for (const [ index, value ] of sequence.entries()) {
		const step = _.castArray(value)
		await Bluebird.map(step, async (segment, subindex, length) => {
			const path = [ 'cards', index ]
			if (length !== 1) {
				path.push(subindex)
			}

			const object = evaluateObject(segment, references)
			if (!object) {
				throw new context.errors.WorkerInvalidTemplate(
					`Could not evaluate template in: ${JSON.stringify(segment, null, 2)}`)
			}

			const typeCard = await context.getCardBySlug(session, object.type, {
				type: 'type'
			})

			if (!typeCard) {
				throw new context.errors.WorkerNoElement(`Invalid type: ${object.type}`)
			}

			const result = await context.insertCard(session, typeCard, {
				timestamp: new Date(),
				actor: options.actor,
				attachEvents: true,
				override: true
			}, object)

			insertedCards.push(result)
			_.set(references, path, result)
		}, {
			concurrency: 3
		})
	}

	return insertedCards
}

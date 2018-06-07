/*
 * Copyright 2017 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const EventEmitter = require('events').EventEmitter

exports.mergeStreams = async (keys, createFunction) => {
	const emitter = new EventEmitter()
	const streams = {}

	emitter.closeStream = (key) => {
		if (!streams[key]) {
			return
		}

		streams[key].close()
		Reflect.deleteProperty(streams, key)
	}

	emitter.restartStream = async (key) => {
		emitter.closeStream(key)
		streams[key] = await createFunction(key)
	}

	for (const key of keys) {
		await emitter.restartStream(key)
		streams[key].on('closed', () => {
			emitter.closeStream(key)
			if (_.isEmpty(streams)) {
				emitter.emit('closed')
			}
		})

		streams[key].on('error', (error) => {
			emitter.emit('error', error, key)
		})

		streams[key].on('data', (data) => {
			emitter.emit('data', data)
		})
	}

	emitter.close = () => {
		_.each(streams, (stream) => {
			stream.close()
		})
	}

	return emitter
}

/**
 * @summary Rudimentary mapping from json schema to a reql filter object
 * @function
 * @public
 *
 * @description Maps `const` values from a json schema into reql filter object
 * @see https://rethinkdb.com/api/javascript/filter/
 *
 * @param {Object} schema - json schema
 * @returns {Object} reql filter object
 *
 * @example
 * const schema = {
 * 	type: 'object',
 * 	properties: {
 * 		type: {
 * 			const: 'message'
 * 		},
 * 		data: {
 * 			type: 'object',
 * 			properties: {
 * 				target: {
 * 					const: 'foobarbaz'
 * 				}
 * 			},
 * 			required: [ 'target' ],
 * 			additionalProperties: true
 * 		},
 * 	},
 * 	required: [ 'type', 'data' ],
 * 	additionalProperties: true
 * }
 * const filter = jsonSchemaToReqlFilter(schema)
 * console.log(filter) // -> {
 *	type: 'message',
 *	data: {
 *		target: 'foobarbaz'
 *	}
 * }
 */
exports.jsonSchemaToReqlFilter = (schema) => {
	return _.reduce(
		schema.properties,
		(result, value, key) => {
			if (value.const) {
				result[key] = value.const
			}

			if (value.type === 'object') {
				result[key] = exports.jsonSchemaToReqlFilter(value)
			}

			return result
		},
		{}
	)
}

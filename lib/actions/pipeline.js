/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

const debug = require('debug')('jellyfish:pipeline')
const Bluebird = require('bluebird')
const EventEmitter = require('events').EventEmitter
const mqemitter = require('mqemitter')

module.exports = class Pipeline extends EventEmitter {
	/**
   * @summary A card stream pipeline
   * @class
   * @public
   *
   * @param {Object} jellyfish - the jellyfish instance
   *
   * @example
   * const pipeline = new Pipeline(jellyfish)
   */
	constructor (jellyfish) {
		super()
		this.stream = null
		this.jellyfish = jellyfish
		this.middlewares = {}
		this.queue = mqemitter({
			concurrency: 1
		})
	}

	/**
   * @summary Start the stream pipeline
   * @function
   * @public
	 *
	 * @param {String} session - session
   *
   * @example
   * const pipeline = new Pipeline(jellyfish)
	 * await pipeline.start('4a962ad9-20b5-4dd8-a707-bf819593cc84')
	 *
	 * pipeline.on('error', (error) => {
	 *   throw error
	 * })
	 *
	 * pipeline.on('change', (change) => {
	 *   console.log(change.before)
	 *   console.log(change.after)
	 * })
   */
	async start (session) {
		debug('Opening wilcard stream')
		this.stream = await this.jellyfish.stream(session, {
			type: 'object',
			additionalProperties: true
		})

		this.queue.on('data', (data, callback) => {
			debug(`Running ${Object.keys(this.middlewares).length} middlewares for received change`)
			this.runMiddleware(data.payload).then(() => {
				debug('Done running middlewares')
				this.emit('change', data.payload)
				callback()
			}).catch((error) => {
				debug(`Middlewares error: ${error.message}`)
				this.emit('error', error)
				callback()
			})
		})

		this.stream.on('data', (change) => {
			this.queue.emit({
				topic: 'data',
				payload: change
			})
		})

		this.stream.on('error', (error, bucket) => {
			this.emit('error', error)
			debug(`Restarting ${bucket} stream after error: ${error.message}`)
			this.stream.restartStream(bucket)
		})
	}

	/**
   * @summary Stop the stream pipeline
   * @function
   * @public
	 *
   * @example
   * const pipeline = new Pipeline(jellyfish)
	 * await pipeline.stop()
   */
	async stop () {
		await new Bluebird((resolve) => {
			if (!this.stream) {
				return resolve()
			}

			debug('Closing stream')
			this.stream.once('closed', () => {
				this.stream = null
				return resolve()
			})

			return this.stream.close()
		})

		debug('Removing middleware functions')
		for (const middleware of Object.keys(this.middlewares)) {
			this.removeFunction(middleware)
		}
	}

	/**
	 * @summary Insert a function into the pipeline
	 * @function
	 * @public
	 *
	 * @param {String} id - id
	 * @param {Function} func - function (change)
	 *
	 * @example
   * const pipeline = new Pipeline(jellyfish)
	 * pipeline.insertFunction('foo', (change) => { ... })
	 */
	insertFunction (id, func) {
		debug(`Inserting middleware function: ${id}`)
		this.middlewares[id] = func
	}

	/**
	 * @summary Remove a function from the pipeline
	 * @function
	 * @public
	 *
	 * @param {String} id - id
	 *
	 * @example
   * const pipeline = new Pipeline(jellyfish)
	 * pipeline.removeFunction('foo')
	 */
	removeFunction (id) {
		debug(`Removing middleware function: ${id}`)
		Reflect.deleteProperty(this.middlewares, id)
	}

	/**
	 * @summary Run the middlewares over a change
	 * @function
	 * @private
	 *
	 * @param {Object} change - element change
	 *
	 * @example
   * const pipeline = new Pipeline(jellyfish)
	 *
	 * await pipeline.runMiddleware({
	 *   before: { ... },
	 *   after: { ... }
	 * })
	 */
	async runMiddleware (change) {
		for (const middleware of Object.values(this.middlewares)) {
			await middleware(change)
		}
	}
}

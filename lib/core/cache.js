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

const Promise = require('bluebird')

module.exports = class Cache {
	/**
	 * @summary The card cache store
	 * @class
	 * @public
	 * @param {Object} options - options
	 * @param {String} options.namespace - will be used as key prefix
	 * @param {Boolean} options.mock - if true uses in memory cache
	 *
	 * @example
	 * const cache = new Cache()
	 */
	constructor (options) {
		this.options = options
		this.tables = new Set()
	}

	/**
	 * @summary Connect to the cache
	 * @function
	 * @public
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * const cache = new Cache()
	 * await cache.connect()
	 */
	// eslint-disable-next-line class-methods-use-this
	async connect () {
		if (this.client) {
			return Promise.resolve()
		}

		if (this.options.mock) {
			// This module is a singleton, and calling `.createClient()` attaches
			// events over the same singleton over and over again, causing
			// Node.js to eventually display:
			//   MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
			// Updating the module itself is doable but tricky to get right given
			// various OOP smells in their architecture, so another workaround
			// is to invalidate the require cache entry, which will force the module
			// to return a new instance every time, as it should be.
			Reflect.deleteProperty(require.cache, require.resolve('redis-mock'))

			const redismock = require('redis-mock')
			Promise.promisifyAll(redismock.RedisClient.prototype)
			Promise.promisifyAll(redismock.Multi.prototype)
			this.client = redismock.createClient(this.options)
		} else {
			const redis = require('redis')
			Promise.promisifyAll(redis.RedisClient.prototype)
			Promise.promisifyAll(redis.Multi.prototype)

			this.client = redis.createClient(this.options)
		}

		return Promise.resolve()
	}

	/**
	 * @summary Disconnect from the cache
	 * @function
	 * @public
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * const cache = new Cache()
	 * await cache.disconnect()
	 */
	// eslint-disable-next-line class-methods-use-this
	async disconnect () {
		if (this.client) {
			await this.client.quit()
			this.client = null
		}

		return Promise.resolve()
	}

	/**
	 * @summary Generate a key scoped by database name
	 * @function
	 * @private
	 *
	 * @param {String} table - table
	 * @param {String} category - category
	 * @param {String} key - key
	 *
	 * @returns {String} key - redis key
	 *
	 * @example
	 * const cache = new Cache()
	 * console.log(cache.generateKey('cards', 'slug', 'xxxxxx'))
	 *
	 * > `database:cards:slug:xxxx`
	 */
	generateKey (table, category, key) {
		return `${this.options.namespace}:${table}:${category}:${key}`
	}

	/**
	 * @summary Set an element in the cache by a certain key
	 * @function
	 * @private
	 *
	 * @param {String} table - table
	 * @param {String} category - category
	 * @param {String} key - key
	 * @param {Object} element - element
	 * @param {Object} backend - redis client
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.setElementByKey('cards', 'slug', 'xxxxxx', {
	 *   id: 'xxxxxx',
	 *   slug: 'foo',
	 *   data: 'baz'
	 * })
	 */
	async setElementByKey (table, category, key, element, backend) {
		if (!key) {
			return
		}

		this.tables.add(table)

		for (const name of this.tables) {
			if (name === table) {
				// Store key with one hour expiration
				const expirationTime = 3600
				await this.client.setAsync(this.generateKey(name, category, key), JSON.stringify(element), 'EX', expirationTime)
			} else if (element) {
				await this.client.setAsync(this.generateKey(name, category, key), 'null')
			}
		}
	}

	/**
	 * @summary Set an element in the cache
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {Object} element - element
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.set('cards', {
	 *   id: 'xxxxxx',
	 *   slug: 'foo',
	 *   data: 'baz'
	 * })
	 */
	async set (table, element) {
		const multi = this.client.multi()

		await Promise.all([
			this.setElementByKey(table, 'id', element.id, element, multi),
			this.setElementByKey(table, 'slug', element.slug, element, multi)
		])

		await multi.exec()
	}

	/**
	 * @summary Set a slug explicitly as "missing"
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {String} slug - slug
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.setMissingSlug('cards', 'foo')
	 */
	async setMissingSlug (table, slug) {
		await this.setElementByKey(table, 'slug', slug, null, this.client)
	}

	/**
	 * @summary Set a slug explicitly as "missing"
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {String} id - id
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.setMissingId('cards', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	 */
	async setMissingId (table, id) {
		await this.setElementByKey(table, 'id', id, null, this.client)
	}

	/**
	 * @summary Get an element from the cache by its category
	 * @function
	 * @private
	 *
	 * @param {String} table - table
	 * @param {String} category - category
	 * @param {String} key - key
	 * @returns {Object} results
	 *
	 * @example
	 * const cache = new Cache()
	 * const result = cache.get('cards', 'id', 'foo')
	 *
	 * if (result.hit) {
	 *   console.log(result.data)
	 * }
	 */
	async get (table, category, key) {
		const result = await this.client.getAsync(this.generateKey(table, category, key))
		if (result) {
			return {
				hit: true,
				element: JSON.parse(result)
			}
		}
		return {
			hit: false
		}
	}

	/**
	 * @summary Get an element from the cache by its id
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {String} id - id
	 * @returns {Object} results
	 *
	 * @example
	 * const cache = new Cache()
	 * const result = cache.getById('cards', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	 *
	 * if (result.hit) {
	 *   console.log(result.data)
	 * }
	 */
	async getById (table, id) {
		return this.get(table, 'id', id)
	}

	/**
	 * @summary Get an element from the cache by its slug
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {String} slug - slug
	 * @returns {Object} results
	 *
	 * @example
	 * const cache = new Cache()
	 * const result = cache.getBySlug('cards', 'foo')
	 *
	 * if (result.hit) {
	 *   console.log(result.data)
	 * }
	 */
	async getBySlug (table, slug) {
		return this.get(table, 'slug', slug)
	}

	/**
	 * @summary Unset an element from the cache
	 * @function
	 * @public
	 *
	 * @param {Object} element - element
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.unset({
	 *   id: 'xxxxxx',
	 *   slug: 'foo',
	 *   data: 'baz'
	 * })
	 */
	async unset (element) {
		for (const name of this.tables) {
			if (element.id) {
				await this.client.delAsync(this.generateKey(name, 'id', element.id))
			}

			if (element.slug) {
				await this.client.delAsync(this.generateKey(name, 'slug', element.slug))
			}
		}
	}

	/**
	 * @summary Reset the cache
	 * @function
	 * @public
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.reset()
	 */
	async reset () {
		if (this.client) {
			await this.client.flushallAsync()
		}
	}
}

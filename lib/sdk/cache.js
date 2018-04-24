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

module.exports = class Cache {
	/**
   * @summary The card cache store
   * @class
   * @public
   *
   * @example
	 * const cache = new Cache()
   */
	constructor () {
		this.reset()
	}

	/**
	 * @summary Set an element in the cache by a certain key
	 * @function
	 * @private
	 *
	 * @param {String} table - table
	 * @param {String} key - key
	 * @param {Object} element - element
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.setElementByKey('cards', 'xxxxxx', {
	 *   id: 'xxxxxx',
	 *   slug: 'foo',
	 *   data: 'baz'
	 * })
	 */
	setElementByKey (table, key, element) {
		if (!key) {
			return
		}

		this.store[table] = this.store[table] || new Map()
		this.store[table].set(key, {
			hit: true,
			element
		})
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
	set (table, element) {
		this.setElementByKey(table, element.id, element)
		this.setElementByKey(table, element.slug, element)
	}

	/**
	 * @summary Set an key explicitly as "missing"
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {String} key - key
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.setMissing('cards', 'foo')
	 */
	setMissing (table, key) {
		this.setElementByKey(table, key, null)
	}

	/**
	 * @summary Get an element from the cache
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {String} key - key
	 * @returns {Object} results
	 *
	 * @example
	 * const cache = new Cache()
	 * const result = cache.get('cards', 'foo')
	 *
	 * if (result.hit) {
	 *   console.log(result.data)
	 * }
	 */
	get (table, key) {
		if (!this.store[table]) {
			return {
				hit: false
			}
		}

		return this.store[table].get(key) || {
			hit: false
		}
	}

	/**
	 * @summary Unset an element from the cache
	 * @function
	 * @public
	 *
	 * @param {String} table - table
	 * @param {Object} element - element
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.unset('cards', {
	 *   id: 'xxxxxx',
	 *   slug: 'foo',
	 *   data: 'baz'
	 * })
	 */
	unset (table, element) {
		if (element.id) {
			this.store[table].delete(element.id)
		}

		if (element.slug) {
			this.store[table].delete(element.slug)
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
	reset () {
		this.store = {}
	}
}

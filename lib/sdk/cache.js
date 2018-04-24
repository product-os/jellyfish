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
		this.store = new Map()
		this.reset()
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
		this.store.set(element.id, {
			hit: true,
			data: {
				table,
				element
			}
		})

		if (element.slug) {
			this.store.set(element.slug, {
				hit: true,
				data: {
					table,
					element
				}
			})
		}
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
	 * cache.setMissing('foo')
	 */
	setMissing (table, key) {
		this.store.set(key, {
			hit: true,
			data: {
				table,
				element: null
			}
		})
	}

	/**
	 * @summary Get an element from the cache
	 * @function
	 * @public
	 *
	 * @param {String} key - key
	 * @returns {Object} results
	 *
	 * @example
	 * const cache = new Cache()
	 * const result = cache.get('foo')
	 *
	 * if (result.hit) {
	 *   console.log(result.data)
	 * }
	 */
	get (key) {
		return this.store.get(key) || {
			hit: false
		}
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
	unset (element) {
		if (element.id) {
			this.store.delete(element.id)
		}

		if (element.slug) {
			this.store.delete(element.slug)
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
		this.store.clear()
	}
}

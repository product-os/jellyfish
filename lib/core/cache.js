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
		this.tables = new Set()
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
	 *
	 * @example
	 * const cache = new Cache()
	 * cache.setElementByKey('cards', 'slug', 'xxxxxx', {
	 *   id: 'xxxxxx',
	 *   slug: 'foo',
	 *   data: 'baz'
	 * })
	 */
	setElementByKey (table, category, key, element) {
		if (!key) {
			return
		}

		this.tables.add(table)
		this.store[table] = this.store[table] || {
			id: new Map(),
			slug: new Map()
		}

		for (const name of this.tables) {
			if (name === table) {
				this.store[name][category].set(key, {
					hit: true,
					element
				})
			} else if (element) {
				this.store[name][category].set(key, {
					hit: true,
					element: null
				})
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
	set (table, element) {
		this.setElementByKey(table, 'id', element.id, element)
		this.setElementByKey(table, 'slug', element.slug, element)
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
	setMissingSlug (table, slug) {
		this.setElementByKey(table, 'slug', slug, null)
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
	setMissingId (table, id) {
		this.setElementByKey(table, 'id', id, null)
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
	get (table, category, key) {
		if (!this.store[table]) {
			return {
				hit: false
			}
		}

		return this.store[table][category].get(key) || {
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
	getById (table, id) {
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
	getBySlug (table, slug) {
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
	unset (element) {
		for (const name of this.tables) {
			if (element.id) {
				this.store[name].id.delete(element.id)
			}

			if (element.slug) {
				this.store[name].slug.delete(element.slug)
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
	reset () {
		this.store = {}
	}
}

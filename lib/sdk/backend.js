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

'use strict'

const rethinkdb = require('rethinkdb')
const _ = require('lodash')
const utils = require('./utils')

const handleInsertionResults = (results, id) => {
  if (results.errors === 0) {
    return _.first(_.get(results, [ 'generated_keys' ], [ id ]))
  }

  throw new Error(results.first_error)
}

module.exports = class Backend {
  /**
   * @summary The Jellyfish Backend
   * @class
   * @public
   *
   * @param {Object} options - options
   * @param {String} options.database - database name
   * @param {String} options.host - database host
   * @param {Number} options.port - database port
   * @param {String} [options.user] - database user
   * @param {String} [options.password] - database password
   * @param {String} [options.certificate] - database SSL certificate
   *
   * @example
   * const backend = new Backend({
   *   database: 'my-jellyfish',
   *   host: 'localhost',
   *   port: 28015,
   *   user: 'admin',
   *   password: 'secret'
   * })
   */
  constructor (options) {
    this.options = {
      host: options.host,
      port: options.port,
      user: options.user,
      password: options.password
    }

    if (options.certificate) {
      this.options.ssl = {
        ca: Buffer.from(options.certificate)
      }
    }

    this.database = options.database
  }

  /**
   * @summary Reset the database
   * @function
   * @public
   *
   * @description
   * For testing purposes.
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   * await backend.reset()
   */
  async reset () {
    const databases = await rethinkdb
      .dbList()
      .run(this.connection)

    if (databases.includes(this.database)) {
      await rethinkdb
        .dbDrop(this.database)
        .run(this.connection)
    }

    await rethinkdb
      .dbCreate(this.database)
      .run(this.connection)
  }

  /**
   * @summary Connect to the database
   * @function
   * @public
   *
   * @description
   * You need to call this method before being able
   * to call any of the other ones.
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   */
  async connect () {
    if (!this.connection) {
      this.connection = await rethinkdb.connect(this.options)
    }
  }

  /**
   * @summary Disconnect from the database
   * @function
   * @public
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   * await backend.disconnect()
   */
  async disconnect () {
    if (this.connection) {
      await this.connection.close()
      this.connection = null
    }
  }

  /**
   * @summary Check if the database has a certain table
   * @function
   * @private
   *
   * @param {String} name - table name
   * @returns {Boolean} whether the table exists
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * if (await backend.hasTable('foo')) {
   *   console.log('The database has a table called foo')
   * }
   */
  async hasTable (name) {
    const tables = await rethinkdb
      .db(this.database)
      .tableList()
      .run(this.connection)

    return tables.includes(name)
  }

  /**
   * @summary Create a table in the database
   * @function
   * @public
   *
   * @param {String} name - table name
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * await backend.createTable('foo')
   */
  async createTable (name) {
    if (!await this.hasTable(name)) {
      await rethinkdb
        .db(this.database)
        .tableCreate(name)
        .run(this.connection)
    }
  }

  /**
   * @summary Insert an element to the database
   * @function
   * @public
   *
   * @description
   * This function will throw if the element already exists.
   *
   * @param {String} table - table name
   * @param {Object} object - the object element
   * @returns {String} inserted element id
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * const id = await backend.insertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
  async insertElement (table, object) {
    await this.createTable(table)

    if (object.id && await this.getElement(table, object.id)) {
      throw new Error(`There is already an element with id ${object.id}`)
    }

    if (object.slug && await this.getElement(table, object.slug)) {
      throw new Error(`There is already an element with slug ${object.slug}`)
    }

    const results = await rethinkdb
      .db(this.database)
      .table(table)
      .insert(object)
      .run(this.connection)

    return handleInsertionResults(results, object.id)
  }

  /**
   * @summary Update an element from the database
   * @function
   * @public
   *
   * @description
   * This function will throw if the element doesn't exist.
   *
   * @param {String} table - table name
   * @param {Object} object - the object element
   * @returns {String} updated element id
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * await backend.insertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   *
   * const id = await backend.updateElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'bar'
   * })
   */
  async updateElement (table, object) {
    await this.createTable(table)

    if (!object.id && !object.slug) {
      throw new Error('You can\'t perform an update without an id nor slug')
    }

    if (object.id) {
      if (object.slug) {
        const element = await this.getElement(table, object.slug)
        if (element && element.id !== object.id) {
          throw new Error(`There is already an element with slug ${object.slug} but the id is not ${object.id}`)
        }
      }

      if (!await this.getElement(table, object.id)) {
        throw new Error(`Can't find element with id ${object.id}`)
      }

      const results = await rethinkdb
        .db(this.database)
        .table(table)
        .get(object.id)
        .replace(object)
        .run(this.connection)

      return handleInsertionResults(results, object.id)
    }

    const element = await this.getElement(table, object.slug)
    if (!element) {
      throw new Error(`Can't find element with slug ${object.slug}`)
    }

    const results = await rethinkdb
      .db(this.database)
      .table(table)
      .filter({
        slug: object.slug
      })
      .limit(1)
      .replace(Object.assign({
        id: element.id
      }, object))
      .run(this.connection)

    return handleInsertionResults(results, element.id)
  }

  /**
   * @summary Insert or update an element from the database
   * @function
   * @public
   *
   * @param {String} table - table name
   * @param {Object} object - the object element
   * @returns {String} upserted element id
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * const id = await backend.upsertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
  async upsertElement (table, object) {
    await this.createTable(table)

    if (!object.slug) {
      if (object.id && await this.getElement(table, object.id)) {
        return this.updateElement(table, object)
      }

      return this.insertElement(table, object)
    }

    if (object.id && await this.getElement(table, object.id)) {
      return this.updateElement(table, object)
    }

    if (await this.getElement(table, object.slug)) {
      return this.updateElement(table, object)
    }

    return this.insertElement(table, object)
  }

  /**
   * @summary Get an element from the database
   * @function
   * @public
   *
   * @param {String} table - table name
   * @param {String} id - element id or slug
   * @returns {(Object|Null)} element
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * const id = await backend.insertElement('foo', {
   *   data: 'foo'
   * })
   *
   * const element = await backend.getElement('foo', id)
   *
   * console.log(element.data)
   * > 'foo'
   */
  async getElement (table, id) {
    if (!await this.hasTable(table)) {
      return null
    }

    if (utils.isUUID(id)) {
      return rethinkdb
        .db(this.database)
        .table(table)
        .get(id)
        .run(this.connection)
    }

    const cursor = await rethinkdb
      .db(this.database)
      .table(table)
      .filter({
        slug: id
      })
      .limit(1)
      .run(this.connection)

    return _.first(await cursor.toArray()) || null
  }
}

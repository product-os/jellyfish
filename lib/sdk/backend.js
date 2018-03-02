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

const rethinkdb = require('rethinkdb')
const _ = require('lodash')
const Bluebird = require('bluebird')

const isUUID = (uuid) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)
}

const handleInsertionResults = (results, id) => {
  if (results.errors === 0) {
    return _.first(_.get(results, [ 'generated_keys' ], [ id ]))
  }

  // TODO: Handle errors property
  return results
}

module.exports = class Backend {
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

  // For testing purposes
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

  async connect () {
    if (!this.connection) {
      this.connection = await rethinkdb.connect(this.options)
    }

    return this.connection
  }

  disconnect () {
    if (this.connection) {
      return this.connection.close()
    }

    return Bluebird.resolve()
  }

  async hasTable (name) {
    const tables = await rethinkdb
      .db(this.database)
      .tableList()
      .run(this.connection)

    return tables.includes(name)
  }

  async createTable (name) {
    if (!await this.hasTable(name)) {
      await rethinkdb
        .db(this.database)
        .tableCreate(name)
        .run(this.connection)
    }
  }

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

  async updateElement (table, object) {
    await this.createTable(table)

    if (!object.id && !object.slug) {
      throw new Error('No identifier to perform an update')
    }

    if (object.id) {
      if (object.slug) {
        const element = await this.getElement(table, object.slug)
        if (element && element.id !== object.id) {
          throw new Error(`No match for id ${object.id} and slug ${object.slug}`)
        }
      } else if (!this.getElement(table, object.id)) {
        throw new Error(`Can't find element ${object.id}`)
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
      throw new Error(`Can't find element ${object.slug}`)
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

  async upsertElement (table, object) {
    await this.createTable(table)

    if (!object.slug) {
      if (object.id) {
        return this.updateElement(table, object)
      }

      return this.insertElement(table, object)
    }

    const element = await this.getElement(table, object.slug)

    // TODO: What happens if the object.id is defined but
    // doesn't exist in the DB??
    if (object.id || (!object.id && element)) {
      return this.updateElement(table, object)
    }

    return this.insertElement(table, object)
  }

  async getElement (table, id) {
    if (!await this.hasTable(table)) {
      return null
    }

    if (isUUID(id)) {
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

    return _.first(await cursor.toArray())
  }
}

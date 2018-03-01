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

    let results = null

    if (object.id) {
      results = await rethinkdb
        .db(this.database)
        .table(table)
        .get(object.id)
        .replace(object)
        .run(this.connection)
    } else if (object.slug) {
      const element = await this.getElement(table, object.slug)

      if (element) {
        object.id = element.id
        results = await rethinkdb
          .db(this.database)
          .table(table)
          .filter({
            slug: object.slug
          })
          .limit(1)
          .replace(object)
          .run(this.connection)
      } else {
        results = await rethinkdb
          .db(this.database)
          .table(table)
          .insert(object)
          .run(this.connection)
      }
    } else {
      results = await rethinkdb
        .db(this.database)
        .table(table)
        .insert(object)
        .run(this.connection)
    }

    if (results.errors === 0) {
      return _.first(_.get(results, [ 'generated_keys' ], [ object.id ]))
    }

    return results
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

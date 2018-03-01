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

const _ = require('lodash')
const rethinkdb = require('rethinkdb')
const Bluebird = require('bluebird')

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

  async checkTable (name) {
    if (!await this.hasTable(name)) {
      throw new Error(`No such table: ${name}`)
    }
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
    await this.checkTable(table)

    const results = await rethinkdb
      .db(this.database)
      .table(table)
      .insert(object)
      .run(this.connection)

    // Return the inserted element key
    if (results.errors === 0) {
      return _.first(_.get(results, [ 'generated_keys' ], [ object.id ]))
    }

    throw new Error(results.first_error)
  }

  async updateElement (table, object) {
    await this.checkTable(table)
    await rethinkdb
      .db(this.database)
      .table(table)
      .get(object.id)
      .update(_.omit(object, [ 'id' ]))
      .run(this.connection)
  }

  async upsertElement (table, object) {
    await this.checkTable(table)
    await rethinkdb
      .db(this.database)
      .table(table)
      .get(object.id)
      .replace(object)
      .run(this.connection)
  }

  async getElement (table, id) {
    await this.checkTable(table)

    // Will already return null if the ID doesn't exist
    return rethinkdb
      .db(this.database)
      .table(table)
      .get(id)
      .run(this.connection)
  }
}

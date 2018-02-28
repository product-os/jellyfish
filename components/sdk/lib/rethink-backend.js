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
const Bluebird = require('bluebird')
const rethinkdb = require('rethinkdb')
const Backend = require('./backend')

module.exports = class RethinkBackend extends Backend {
  constructor (options) {
    super(options.database)

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
  }

  onConnect () {
    return rethinkdb.connect(this.options)
  }

  onDisconnect () {
    return this.connection.close()
  }

  async hasTable (name) {
    const tables = await rethinkdb
      .db(this.database)
      .tableList()
      .run(this.connection)

    return tables.includes(name)
  }

  onCreateTable (name) {
    return rethinkdb
      .db(this.database)
      .tableCreate(name)
      .run(this.connection)
  }

  async onInsertElement (table, object) {
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

  onUpdateElement (table, object) {
    return rethinkdb
      .db(this.database)
      .table(table)
      .get(object.id)
      .update(_.omit(object, [ 'id' ]))
      .run(this.connection)
  }

  onGetElement (table, id) {
    // Will already return null if the ID doesn't exist
    return rethinkdb
      .db(this.database)
      .table(table)
      .get(id)
      .run(this.connection)
  }
}

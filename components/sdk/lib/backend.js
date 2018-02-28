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

const Bluebird = require('bluebird')

module.exports = class Backend {
  constructor (database) {
    this.database = database
  }

  async connect () {
    if (!this.connection) {
      this.connection = await this.onConnect()
    }

    return this.connection
  }

  disconnect () {
    if (this.connection) {
      return this.onDisconnect()
    }

    return Bluebird.resolve()
  }

  async checkTable (name) {
    if (!await this.hasTable(name)) {
      throw new Error(`No such table: ${name}`)
    }
  }

  async createTable (name) {
    if (!await this.hasTable(name)) {
      await this.onCreateTable(name)
    }
  }

  async insertElement (table, object) {
    await this.checkTable(table)
    return this.onInsertElement(table, object)
  }

  async updateElement (table, object) {
    await this.checkTable(table)
    await this.onUpdateElement(table, object)
  }

  // Will already return null if the ID doesn't exist
  async getElement (table, id) {
    await this.checkTable(table)
    return this.onGetElement(table, id)
  }
}

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
const Bluebird = require('bluebird')
const ava = require('ava')
const proxy = require('../lib/index')

const DATABASE = process.env.TEST_DB

const dbOptions = {
  host: process.env.TEST_HOST,
  port: process.env.TEST_DB_PORT
}

const proxyOptions = {
  host: dbOptions.host,
  port: process.env.TEST_PROXY_PORT
}

const populate = async (database, connection) => {
  await rethinkdb.db(database).tableCreate('example').run(connection)
  await rethinkdb.db(database).table('example').insert([
    {
      title: 'foo'
    },
    {
      title: 'bar'
    },
    {
      title: 'baz'
    }
  ]).run(connection)
}

ava.test.beforeEach(async (test) => {
  test.context.connection = await rethinkdb.connect(dbOptions)
  await rethinkdb.dbDrop(DATABASE).run(test.context.connection)
  await rethinkdb.dbCreate(DATABASE).run(test.context.connection)
  await populate(DATABASE, test.context.connection)

  test.context.proxy = proxy.listen({
    port: proxyOptions.port,
    db: dbOptions
  })

  await Bluebird.fromCallback((callback) => {
    test.context.proxy.on('ready', callback)
  })
})

ava.test.afterEach(async (test) => {
  await test.context.connection.close()
  await proxy.close(test.context.proxy)
})

const queries = [
  rethinkdb.db(DATABASE).table('example'),
  rethinkdb.db(DATABASE).table('example').filter({
    title: 'bar'
  })
]

queries.forEach((query) => {
  ava.test.skip(`should send and respond to: ${JSON.stringify(query.build())}`, async (test) => {
    const proxiedQuery = proxy.sendQuery(query, proxyOptions)
    const proxyResults = await new Bluebird((resolve, reject) => {
      proxiedQuery.on('done', resolve)
      proxiedQuery.on('error', reject)
    })

    const cursor = await query.run(test.context.connection)
    const driverResults = await Bluebird.fromCallback((callback) => {
      return cursor.toArray(callback)
    })

    test.deepEqual(driverResults, proxyResults)
  })
})

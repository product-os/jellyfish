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

import express = require('express')
import Bluebird = require('bluebird')
import ui = require('./ui/lib/index')
import permissionsProxy = require('./permissions-proxy/lib/index')
const app = express()

if (app.get('env') === 'production') {
  app.set('port', process.env.PORT)
  app.set('proxy-port', process.env.PROXY_PORT)
  app.set('db-port', process.env.DB_PORT)
  app.set('db-host', process.env.DB_HOST)
  app.set('db-user', process.env.DB_USER)
  app.set('db-password', process.env.DB_PASSWORD)
  app.set('db-cert', process.env.DB_CERT)
} else {
  app.set('port', 8000)
  app.set('proxy-port', 9999)
  app.set('db-port', 28015)
  app.set('db-host', 'localhost')
  app.set('db-user', '')
  app.set('db-password', '')
  app.set('db-cert', null)
}

app.use('/ui', ui.app)

app.get('/', (request, response) => {
  response.redirect('/ui')
})

const proxy = permissionsProxy.listen({
  port: app.get('proxy-port'),
  db: {
    host: app.get('db-host'),
    port: app.get('db-port'),
    user: app.get('db-user'),
    password: app.get('db-password')
  }
})

proxy.on('error', (error) => {
  throw error
})

proxy.on('ready', () => {
  console.log(`Permissions proxy listening on port ${app.get('proxy-port')}`)
  console.log(`Redirecting queries to ${app.get('db-host')}:${app.get('db-port')}`)

  app.listen(app.get('port'), () => {
    console.log(`HTTP app listening on port ${app.get('port')}!`)
  })
})

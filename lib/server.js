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
const express = require('express')
const bodyParser = require('body-parser')
const ui = require('./ui')
const sdk = require('./sdk')
const app = express()

if (app.get('env') === 'production') {
  app.set('port', process.env.PORT)
  app.set('db-port', process.env.DB_PORT)
  app.set('db-host', process.env.DB_HOST)
  app.set('db-user', process.env.DB_USER)
  app.set('db-password', process.env.DB_PASSWORD)
  app.set('db-cert', process.env.DB_CERT)
} else {
  app.set('port', 8000)
  app.set('db-port', 28015)
  app.set('db-host', 'localhost')
  app.set('db-user', '')
  app.set('db-password', '')
  app.set('db-cert', null)
}

app.use(bodyParser.json())

sdk.create({
  tables: {
    cards: 'cards',
    requests: 'requests'
  },
  backend: {
    host: app.get('db-host'),
    port: app.get('db-port'),
    user: app.get('db-user'),
    password: app.get('db-password'),
    certificate: app.get('db-cert'),
    database: 'jellyfish'
  }
}).then((jellyfish) => {
  jellyfish.stream({
    type: 'object',
    properties: {
      type: {
        type: 'string',
        const: 'action-request'
      },
      data: {
        type: 'object',
        properties: {
          executed: {
            type: 'boolean',
            const: false
          }
        },
        required: [ 'executed' ]
      }
    },
    required: [ 'type' ]
  }).then((requestStream) => {
    requestStream.on('error', (error) => {
      throw error
    })

    const executeRequest = (request) => {
      jellyfish.executeAction(
        request.data.action,
        request.data.target,
        request.data.arguments
      ).then((results) => {
        return jellyfish.setActionRequestResults(request.id, results)
      })
    }

    requestStream.on('add', executeRequest)
    requestStream.on('change', executeRequest)

    app.use('/ui', ui)

    app.get('/', (request, response) => {
      response.redirect('/ui')
    })

    app.get('/api/v1/query', (request, response) => {
      if (_.isEmpty(request.body)) {
        return response.status(400).json({
          error: true,
          data: 'No schema'
        })
      }

      return jellyfish.query(request.body).then((results) => {
        response.status(200).json({
          error: false,
          data: results
        })
      }).catch((error) => {
        response.status(500).json({
          error: true,
          data: error.message
        })
      })
    })

    app.post('/api/v1/action', (request, response) => {
      if (_.isEmpty(request.body)) {
        return response.status(400).json({
          error: true,
          data: 'No action request'
        })
      }

      return jellyfish.requestAction(request.body.action, request.body.target, request.body.arguments).then((id) => {
        return jellyfish.waitForActionRequestResults(id).then((results) => {
          response.status(200).json({
            error: false,
            data: {
              request: id,
              result: results
            }
          })
        })
      }).catch((error) => {
        response.status(500).json({
          error: true,
          data: error.message
        })
      })
    })

    app.listen(app.get('port'), () => {
      console.log(`HTTP app listening on port ${app.get('port')}!`)
    })
  })
})

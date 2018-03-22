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
const debug = require('debug')('jellyfish:api')
const path = require('path')
const sdk = require('./sdk')
const actions = require('./actions')
const utils = require('./utils')
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
app.use(express.static('dist'))

sdk.create({
	tables: {
		cards: 'cards',
		requests: 'requests',
		sessions: 'sessions'
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
	return actions.listen(jellyfish).then((actionServer) => {
		actionServer.on('error', (error) => {
			throw error
		})

		actionServer.on('request', (request) => {
			debug(`Processed action request: ${request.id}`)
		})

		app.get('/', (request, response) => {
			response.sendFile(path.join('dist', 'index.html'))
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

			debug(`Requesting action: ${request.body.action} -> ${request.body.target}`)
			return actions.createRequest(jellyfish, {
				targetId: request.body.target,
				actorId: 'user-admin',
				action: request.body.action,
				arguments: request.body.arguments
			}).then((id) => {
				debug(`Action request created: ${id}`)
				debug(`Waiting for request results: ${id}`)
				return utils.waitForRequestResults(jellyfish, id).then((results) => {
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

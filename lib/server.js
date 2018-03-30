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
const ActionRequestWorker = require('./actions')
const utils = require('./utils')
const app = express()

if (app.get('env') === 'production') {
	app.set('port', process.env.PORT)
	app.set('db-port', process.env.DB_PORT)
	app.set('db-host', process.env.DB_HOST)
	app.set('db-user', process.env.DB_USER)
	app.set('db-password', process.env.DB_PASSWORD)
	app.set('db-cert', process.env.DB_CERT)
	app.set('actions-username', process.env.ACTIONS_USERNAME)
	app.set('actions-password', process.env.ACTIONS_PASSWORD)
	app.set('actions-email', process.env.ACTIONS_EMAIL)
} else {
	app.set('port', 8000)
	app.set('db-port', 28015)
	app.set('db-host', 'localhost')
	app.set('db-user', '')
	app.set('db-password', '')
	app.set('db-cert', null)
	app.set('actions-username', 'actions')
	app.set('actions-password', 'test')
	app.set('actions-email', 'accounts+jellyfish@resin.io')
}

app.use(bodyParser.json())
app.use(express.static('dist'))

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
	next()
})

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
	return ActionRequestWorker.setup(jellyfish, jellyfish.sessions.admin, {
		username: app.get('actions-username'),
		password: app.get('actions-password'),
		email: app.get('actions-email')
	}).then((actionsSession) => {
		console.log(actionsSession)
		return new ActionRequestWorker(jellyfish, actionsSession)
	}).then((worker) => {
		worker.start().then((actionServer) => {
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
				console.log(request.query)

				if (_.isEmpty(request.query)) {
					return response.status(400).json({
						error: true,
						data: 'No schema'
					})
				}

				const authorization = request.headers.authorization
				if (!authorization) {
					return response.status(401).json({
						error: true,
						data: 'No session token'
					})
				}

				const session = _.last(_.split(authorization, ' '))
				const schema = utils.deserializeQuery(request.query)

				console.log(schema)

				return jellyfish.query(session, schema).then((results) => {
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

			app.get('/api/v1/query-view/:id', (request, response) => {
				const {
					id
				} = request.params

				const authorization = request.headers.authorization
				if (!authorization) {
					return response.status(401).json({
						error: true,
						data: 'No session token'
					})
				}

				const session = _.last(_.split(authorization, ' '))

				return utils.queryView(jellyfish, session, id).then((results) => {
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

			app.post('/api/v1/signup', (request, response) => {
				if (_.isEmpty(request.body)) {
					return response.status(400).json({
						error: true,
						data: 'No credentials'
					})
				}

				const authorization = request.headers.authorization
				if (!authorization) {
					return response.status(401).json({
						error: true,
						data: 'No session token'
					})
				}

				const session = _.last(_.split(authorization, ' '))

				return utils.signup(jellyfish, session, worker, {
					username: request.body.username,
					password: request.body.password,
					email: request.body.email
				}).then((data) => {
					response.status(200).json({
						error: false,
						data
					})
				}).catch((error) => {
					response.status(500).json({
						error: true,
						data: error.message
					})
				})
			})

			app.post('/api/v1/login', (request, response) => {
				if (_.isEmpty(request.body)) {
					return response.status(400).json({
						error: true,
						data: 'No credentials'
					})
				}

				return utils.login(jellyfish, jellyfish.sessions.guest, worker, {
					username: request.body.username,
					password: request.body.password
				}).then((data) => {
					response.status(200).json({
						error: false,
						data
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

				const authorization = request.headers.authorization
				if (!authorization) {
					return response.status(401).json({
						error: true,
						data: 'No session token'
					})
				}

				const session = _.last(_.split(authorization, ' '))

				debug(`Requesting action: ${request.body.action} -> ${request.body.target}`)

				return utils.executeAndWaitAction(jellyfish, session, worker, {
					targetId: request.body.target,
					action: request.body.action,
					arguments: request.body.arguments,
					transient: request.body.transient
				}).then((data) => {
					response.status(200).json({
						error: false,
						data
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
		}).catch((error) => {
			throw error
		})
	})
})

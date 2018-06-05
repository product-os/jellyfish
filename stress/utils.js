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
const request = require('request')

const client = request.defaults({
	baseUrl: 'http://localhost:8000',
	json: true
})

exports.dispatchAction = (session, body) => {
	const headers = session ? {
		Authorization: `Bearer ${session}`
	} : {}

	return new Bluebird((resolve, reject) => {
		client.post({
			url: '/api/v1/action',
			headers,
			body
		}, (error, response) => {
			if (error) {
				return reject(error)
			}

			if (response.body.error) {
				return reject(new Error(response.body.data))
			}

			return resolve(response.body.data.results.data)
		})
	})
}

exports.query = (session, schema) => {
	const headers = session ? {
		Authorization: `Bearer ${session}`
	} : {}

	return new Bluebird((resolve, reject) => {
		client.post({
			url: '/api/v1/query',
			headers,
			body: {
				query: schema
			}
		}, (error, response) => {
			if (error) {
				return reject(error)
			}

			if (response.body.error) {
				return reject(new Error(response.body.data))
			}

			return resolve(response.body.data)
		})
	})
}

exports.login = (session, username, password) => {
	return exports.dispatchAction(session, {
		target: username,
		action: 'action-create-session',
		arguments: {
			password: {
				hash: {
					string: password,
					salt: username
				}
			}
		}
	}).catch({
		message: `No such target: ${username}`
	}, _.constant(null))
}

exports.signup = (username, password) => {
	return exports.dispatchAction(null, {
		target: 'user',
		action: 'action-create-user',
		arguments: {
			email: 'test@example.com',
			username,
			hash: {
				string: password,
				salt: username
			}
		}
	})
}

exports.getUser = async (session, username) => {
	return _.first(await exports.query(session, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'user'
			},
			slug: {
				type: 'string',
				const: username
			}
		}
	}))
}

exports.getSession = async (username, password) => {
	const session = await exports.login(null, username, password)
	if (session) {
		return session
	}

	await exports.signup(username, password)
	return exports.getSession(username, password)
}

exports.createCard = (session, type, properties) => {
	return exports.dispatchAction(session, {
		target: type,
		action: 'action-create-card',
		arguments: {
			properties
		}
	})
}

exports.createEvent = (session, type, actor, target, payload) => {
	const currentDate = new Date()
	return exports.createCard(session, type, {
		data: {
			timestamp: currentDate.toISOString(),
			target,
			actor,
			payload
		}
	})
}

// Display entries from marky in the console
exports.logSummary = (entries) => {
	console.log('\n==== ENTRIES\n')
	entries.forEach((entry) => {
		console.log(`${entry.name}: ${entry.duration}`)
	})

	console.log('\n==== SUMMARY\n')
	const durations = _.map(entries, 'duration')
	console.log(`Min: ${_.min(durations)}`)
	console.log(`Max: ${_.max(durations)}`)
	console.log(`Avg: ${_.sum(durations) / durations.length}`)
}

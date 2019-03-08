/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const request = require('request')
const percentile = require('percentile')

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
			url: '/api/v2/action',
			headers,
			body: {
				card: body.target,
				action: body.action,
				arguments: body.arguments
			}
		}, (error, response) => {
			if (error) {
				return reject(error)
			}

			if (response.body.error) {
				return reject(new Error(response.body.data.message))
			}

			return resolve(response.body.data)
		})
	})
}

exports.query = (session, schema) => {
	const headers = session ? {
		Authorization: `Bearer ${session}`
	} : {}

	return new Bluebird((resolve, reject) => {
		client.get({
			url: '/api/v2/query',
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
	}).get('id').catch({
		message: `No such input card: ${username}`
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
exports.logSummary = (entries, title) => {
	if (title) {
		console.log('--------------------')
		console.log(title.toUpperCase())
		console.log('--------------------')
	}

	console.log('\n==== ENTRIES\n')
	entries.forEach((entry) => {
		console.log(`${entry.name}: ${entry.duration}`)
	})

	console.log('\n==== SUMMARY\n')
	const durations = _.sortBy(_.map(entries, 'duration'))

	_.each([ 80, 90, 95, 99 ], (percentage) => {
		console.log(`${percentage}th -> ${percentile(percentage, durations)}ms`)
	})
}

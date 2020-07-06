/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const nock = require('nock')
const jwt = require('jsonwebtoken')
const scenario = require('./scenario')
const environment = require('@balena/jellyfish-environment')
const TOKEN = environment.integration.github
const helpers = require('./helpers')

ava.serial.before(async (test) => {
	await scenario.before(test)
	await helpers.save(test)
})
ava.serial.beforeEach(async (test) => {
	if (TOKEN.api && TOKEN.key) {
		await nock('https://api.github.com')
			.persist()
			.post(/^\/app\/installations\/\d+\/access_tokens$/)
			.reply(function (uri, request, callback) {
				const token = this.req.headers.authorization[0].split(' ')[1]
				jwt.verify(token, TOKEN.key, {
					algorithms: [ 'RS256' ]
				}, (error) => {
					if (error) {
						return callback(error)
					}

					return callback(null, [
						201,
						{
							token: TOKEN.api,
							expires_at: '2056-07-11T22:14:10Z',
							permissions: {
								issues: 'write',
								contents: 'read'
							},
							repositories: []
						}
					])
				})
			})
	}
})

ava.serial.after.always(scenario.after)
ava.serial.afterEach.always(scenario.afterEach)

scenario.run(ava, {
	integration: require('../../../lib/sync/integrations/github'),
	scenarios: require('./webhooks/github'),
	baseUrl: 'https://api.github.com',
	stubRegex: /.*/,
	source: 'github',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization &&
			request.headers.authorization[0] === `token ${self.options.token.api}`
	}
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const request = require('request')
const _ = require('lodash')
const nock = require('nock')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const outreachMock = require('./outreach-mock')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.outreach

ava.before(async (test) => {
	await helpers.mirror.before(test)
})

const OAUTH_DETAILS = {
	access_token: 'MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3',
	token_type: 'bearer',
	expires_in: 3600,
	refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
	scope: 'create'
}

const NOCK_OPTS = {
	reqheaders: {
		Authorization: `Bearer ${OAUTH_DETAILS.access_token}`
	}
}

ava.after(helpers.mirror.after)
ava.beforeEach(async (test) => {
	await helpers.mirror.beforeEach(
		test, environment.integration.default.user)

	await test.context.sdk.auth.loginWithToken(
		test.context.jellyfish.sessions.admin)

	await test.context.jellyfish.patchCardBySlug(
		test.context.context,
		test.context.jellyfish.sessions.admin,
		`user-${environment.integration.default.user}`, [
			{
				op: 'add',
				path: '/data/oauth',
				value: {}
			},
			{
				op: 'add',
				path: '/data/oauth/outreach',
				value: OAUTH_DETAILS
			}
		], {
			type: 'user'
		})

	test.context.getProspect = async (id) => {
		return new Bluebird((resolve, reject) => {
			request({
				method: 'GET',
				baseUrl: 'https://api.outreach.io',
				uri: `/api/v2/prospects/${id}`,
				json: true,
				headers: {
					Authorization: NOCK_OPTS.reqheaders.Authorization
				}
			}, (error, response, body) => {
				if (error) {
					return reject(error)
				}

				if (response.statusCode === 404) {
					return resolve(null)
				}

				if (response.statusCode !== 200) {
					return reject(new Error(
						`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`))
				}

				return resolve(body)
			})
		})
	}

	nock.cleanAll()
	nock.disableNetConnect()
	nock.enableNetConnect('localhost')

	await nock('https://api.outreach.io', NOCK_OPTS)
		.post('/api/v2/prospects')
		.reply((uri, body, callback) => {
			const result = outreachMock.postProspect(body)
			return callback(null, [ result.code, result.response ])
		})

	await nock('https://api.outreach.io', NOCK_OPTS)
		.patch(/^\/api\/v2\/prospects\/\d+$/)
		.reply((uri, body, callback) => {
			const id = _.parseInt(_.last(uri.split('/')))
			if (id !== body.data.id) {
				return callback(new Error('Ids do not match'))
			}

			const result = outreachMock.patchProspect(body)
			return callback(null, [ result.code, result.response ])
		})

	await nock('https://api.outreach.io', NOCK_OPTS)
		.get(/^\/api\/v2\/prospects\/\d+$/)
		.reply((uri, body, callback) => {
			const result = outreachMock.getProspect(
				_.parseInt(_.last(uri.split('/'))))
			return callback(null, [ result.code, result.response ])
		})
})

ava.afterEach(async (test) => {
	nock.cleanAll()
	await helpers.mirror.afterEach(test)
})

// Skip all tests if there is no Outreach app id and secret
const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.serial.skip : ava.serial

avaTest('should create a simple user', async (test) => {
	const username = `test-${uuid()}`

	const createResult = await test.context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: 'johndoe@balena.io',
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			roles: [ 'user-community' ]
		}
	})

	const user = await test.context.sdk.card.get(createResult.id)

	test.deepEqual(user.data, {
		email: 'johndoe@balena.io',
		hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		mirrors: [ 'https://api.outreach.io/api/v2/prospects/1' ],
		roles: [ 'user-community' ]
	})

	const prospect = await test.context.getProspect(1)

	test.deepEqual(prospect.data.attributes.emails, [ 'johndoe@balena.io' ])
	test.is(prospect.data.attributes.name, username)
	test.is(prospect.data.attributes.nickname, username)
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const querystring = require('querystring')
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

	outreachMock.reset()

	await nock('https://api.outreach.io', NOCK_OPTS)
		.persist()
		.get('/api/v2/prospects')
		.query((object) => {
			return object.filter && object.filter.emails
		})
		.reply((uri, body, callback) => {
			const params = querystring.parse(_.last(uri.split('?')))
			const result = outreachMock.getProspectByEmail(params['filter[emails]'])
			return callback(null, [ result.code, result.response ])
		})

	await nock('https://api.outreach.io', NOCK_OPTS)
		.persist()
		.post('/api/v2/prospects')
		.reply((uri, body, callback) => {
			const result = outreachMock.postProspect(body)
			return callback(null, [ result.code, result.response ])
		})

	await nock('https://api.outreach.io', NOCK_OPTS)
		.persist()
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
		.persist()
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

avaTest('should link a use with an existing prospect', async (test) => {
	const username = `test-${uuid()}`

	const prospectResult = await outreachMock.postProspect({
		data: {
			type: 'prospect',
			attributes: {
				emails: [ `${username}@test.io` ],
				firstName: 'John',
				lastName: 'Doe'
			}
		}
	})

	test.is(prospectResult.code, 201)

	const createResult = await test.context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: `${username}@test.io`,
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			roles: [ 'user-community' ],
			profile: {
				city: 'Oxford',
				country: 'United Kingdom'
			}
		}
	})

	const user = await test.context.sdk.card.get(createResult.id)

	test.deepEqual(user.data, {
		email: `${username}@test.io`,
		hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		mirrors: user.data.mirrors,
		profile: {
			city: 'Oxford',
			country: 'United Kingdom',
			name: {
				first: 'John',
				last: 'Doe'
			}
		},
		roles: [ 'user-community' ]
	})

	test.is(user.data.mirrors.length, 1)
	test.true(user.data.mirrors[0].startsWith('https://api.outreach.io/api/v2/prospects/'))
	const prospectId = _.parseInt(_.last(user.data.mirrors[0].split('/')))
	const prospect = await test.context.getProspect(prospectId)

	test.deepEqual(prospect.data.attributes.emails, [ `${username}@test.io` ])
	test.is(prospect.data.attributes.firstName, 'John')
	test.is(prospect.data.attributes.lastName, 'Doe')
	test.is(prospect.data.attributes.addressCity, 'Oxford')
	test.is(prospect.data.attributes.addressCountry, 'United Kingdom')
})

avaTest('should create a simple user', async (test) => {
	const username = `test-${uuid()}`

	const createResult = await test.context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: `${username}@test.io`,
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			roles: [ 'user-community' ]
		}
	})

	const user = await test.context.sdk.card.get(createResult.id)

	test.deepEqual(user.data, {
		email: `${username}@test.io`,
		hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		mirrors: user.data.mirrors,
		roles: [ 'user-community' ]
	})

	test.is(user.data.mirrors.length, 1)
	test.true(user.data.mirrors[0].startsWith('https://api.outreach.io/api/v2/prospects/'))
	const prospectId = _.parseInt(_.last(user.data.mirrors[0].split('/')))
	const prospect = await test.context.getProspect(prospectId)

	test.deepEqual(prospect.data.attributes.emails, [ `${username}@test.io` ])
	test.is(prospect.data.attributes.name, username)
	test.is(prospect.data.attributes.nickname, username)
})

avaTest('should create a simple user without an email', async (test) => {
	const username = `test-${uuid()}`

	const createResult = await test.context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			roles: [ 'user-community' ]
		}
	})

	const user = await test.context.sdk.card.get(createResult.id)

	test.deepEqual(user.data, {
		hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		mirrors: user.data.mirrors,
		roles: [ 'user-community' ]
	})

	test.is(user.data.mirrors.length, 1)
	test.true(user.data.mirrors[0].startsWith('https://api.outreach.io/api/v2/prospects/'))
	const prospectId = _.parseInt(_.last(user.data.mirrors[0].split('/')))
	const prospect = await test.context.getProspect(prospectId)

	test.deepEqual(prospect.data.attributes.emails, [])
	test.is(prospect.data.attributes.name, username)
	test.is(prospect.data.attributes.nickname, username)
})

avaTest('should not create a prospect with an excluded email address', async (test) => {
	const username = `test-${uuid()}`

	const createResult = await test.context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: `${username}@balena.io`,
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			roles: [ 'user-community' ]
		}
	})

	const user = await test.context.sdk.card.get(createResult.id)

	test.deepEqual(user.data, {
		email: `${username}@balena.io`,
		hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		roles: [ 'user-community' ]
	})

	const results = await outreachMock.getProspectByEmail(`${username}@balena.io`)
	test.deepEqual(results, {
		code: 200,
		response: {
			data: [],
			meta: {
				count: 0
			}
		}
	})
})

avaTest('should not sync emails on users with new@change.me', async (test) => {
	const username = `test-${uuid()}`

	const createResult = await test.context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: 'new@change.me',
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			roles: [ 'user-community' ]
		}
	})

	const user = await test.context.sdk.card.get(createResult.id)

	test.deepEqual(user.data, {
		email: 'new@change.me',
		hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		mirrors: user.data.mirrors,
		roles: [ 'user-community' ]
	})

	test.is(user.data.mirrors.length, 1)
	test.true(user.data.mirrors[0].startsWith('https://api.outreach.io/api/v2/prospects/'))
	const prospectId = _.parseInt(_.last(user.data.mirrors[0].split('/')))
	const prospect = await test.context.getProspect(prospectId)

	test.deepEqual(prospect.data.attributes.emails, [])
	test.is(prospect.data.attributes.name, username)
	test.is(prospect.data.attributes.nickname, username)
})

avaTest('should not sync emails on users with unknown@change.me', async (test) => {
	const username = `test-${uuid()}`

	const createResult = await test.context.sdk.card.create({
		slug: `user-${username}`,
		type: 'user',
		data: {
			email: 'unknown@change.me',
			hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
			roles: [ 'user-community' ]
		}
	})

	const user = await test.context.sdk.card.get(createResult.id)

	test.deepEqual(user.data, {
		email: 'unknown@change.me',
		hash: '$2b$12$tnb9eMnlGpEXld1IYmIlDOud.v4vSUbnuEsjFQz3d/24sqA6XmaBq',
		mirrors: user.data.mirrors,
		roles: [ 'user-community' ]
	})

	test.is(user.data.mirrors.length, 1)
	test.true(user.data.mirrors[0].startsWith('https://api.outreach.io/api/v2/prospects/'))
	const prospectId = _.parseInt(_.last(user.data.mirrors[0].split('/')))
	const prospect = await test.context.getProspect(prospectId)

	test.deepEqual(prospect.data.attributes.emails, [])
	test.is(prospect.data.attributes.name, username)
	test.is(prospect.data.attributes.nickname, username)
})

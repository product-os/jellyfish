/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const nock = require('nock')
const querystring = require('querystring')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const macros = require('./macros')
const environment = require('../../../lib/environment')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const userDetails = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

ava.before(async () => {
	await helpers.browser.beforeEach({
		context
	})
})

ava.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

const outreachTest =
	environment.integration.outreach.appId &&
	environment.integration.outreach.appSecret
		? ava.serial
		: ava.serial.skip

outreachTest('A user should be able to connect their account to outreach', async (test) => {
	const {
		page
	} = context

	await page.goto(`http://localhost:${environment.ui.port}`)
	const user = await context.createUser(userDetails)

	await context.addUserToBalenaOrg(user.id)

	await macros.loginUser(page, userDetails)

	// Navigate to the user profile page
	await page.goto(`http://localhost:${environment.ui.port}/${user.slug}`)

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(4)')

	// Wait for the outreach API redirect to occur before continuing
	await new Promise(async (resolve) => {
		const requestListener = (req) => {
			if (
				req.isNavigationRequest() &&
				req.frame() === page.mainFrame() &&
				req.url().includes('https://accounts.outreach.io/oauth/authorize')
			) {
				req.abort('aborted')
				page.removeListener('request', requestListener)
				resolve()
			} else {
				req.continue()
			}
		}

		page.on('request', requestListener)

		await page.setRequestInterception(true)

		await macros.waitForThenClickSelector(page, '[data-test="integration-connection--outreach"]')
	})

	await page.setRequestInterception(false)

	nock.cleanAll()

	// Nock is used here to proxy the authorization request to the outreach API
	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration.outreach.appId,
				client_secret: environment.integration.outreach.appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
				code: '123456'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	await page.goto(`http://localhost:${environment.ui.port}/oauth/outreach?code=123456&state=${user.slug}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')

	const updatedUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})

	test.deepEqual(updatedUser.data.oauth, {
		outreach: {
			access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
			token_type: 'bearer',
			expires_in: 3600,
			refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
			scope: 'create'
		}
	})
})

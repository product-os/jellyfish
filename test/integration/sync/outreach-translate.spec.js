/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const scenario = require('./scenario')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.outreach
const helpers = require('./helpers')

const OAUTH_DETAILS = {
	access_token: 'MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3',
	token_type: 'bearer',
	expires_in: 3600,
	refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
	scope: 'create'
}

ava.serial.before(async (test) => {
	await scenario.before(test)

	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context,
		test.context.jellyfish.sessions.admin,
		`user-${environment.integration.default.user}@latest`)

	await test.context.jellyfish.patchCardBySlug(
		test.context.context,
		test.context.jellyfish.sessions.admin,
		`${userCard.slug}@${userCard.version}`, [
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

	await helpers.save(test)
})

ava.serial.after.always(scenario.after)
ava.serial.afterEach.always(scenario.afterEach)

scenario.run(ava, {
	integration: require('../../../lib/sync/integrations/outreach'),
	scenarios: require('./webhooks/outreach'),
	slices: _.range(0, 50),
	baseUrl: 'https://api.outreach.io',
	stubRegex: /.*/,
	source: 'outreach',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization === `Bearer ${OAUTH_DETAILS.access_token}`
	}
})

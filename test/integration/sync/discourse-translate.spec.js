/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const querystring = require('querystring')
const _ = require('lodash')
const nock = require('nock')
const uuid = require('uuid/v4')
const url = require('url')
const scenario = require('./scenario')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.discourse

ava.beforeEach(scenario.beforeEach)
ava.afterEach(scenario.afterEach)

const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava

avaTest('should not change the same user email', async (test) => {
	await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'user-jviotti',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'juan@resin.io',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	nock('https://forums.balena.io')
		.get('/admin/users/4.json')
		.query({
			api_key: TOKEN.api,
			api_username: TOKEN.username
		})
		.reply(200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/admin-users-4-json.json'))

	nock('https://forums.balena.io')
		.get('/t/6061.json')
		.query({
			api_key: TOKEN.api,
			api_username: TOKEN.username,
			print: true
		})
		.reply(200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/t-6061-json-print-true.json'))

	nock('https://forums.balena.io')
		.get('/categories.json')
		.query({
			api_key: TOKEN.api,
			api_username: TOKEN.username
		})
		.reply(200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/categories-json.json'))

	for (const externalEvent of [
		Object.assign({}, require('./webhooks/discourse/inbound-tag-tag/01.json'), {
			source: 'discourse'
		})
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event@1.0.0',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: externalEvent
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event@1.0.0',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const user = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-jviotti@latest')

	test.true(user.active)
	test.deepEqual(user.data, {
		email: 'juan@resin.io',
		hash: 'PASSWORDLESS',
		roles: [],
		profile: {
			title: 'Software Engineer',
			name: {
				first: 'Juan'
			}
		}
	})
})

avaTest('should add a new e-mail to a user', async (test) => {
	await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'user-jviotti',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'foo@bar.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	nock('https://forums.balena.io')
		.get('/admin/users/4.json')
		.query({
			api_key: TOKEN.api,
			api_username: TOKEN.username
		})
		.reply(200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/admin-users-4-json.json'))

	nock('https://forums.balena.io')
		.get('/t/6061.json')
		.query({
			api_key: TOKEN.api,
			api_username: TOKEN.username,
			print: true
		})
		.reply(200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/t-6061-json-print-true.json'))

	nock('https://forums.balena.io')
		.get('/categories.json')
		.query({
			api_key: TOKEN.api,
			api_username: TOKEN.username
		})
		.reply(200,
			require('./webhooks/discourse/inbound-tag-tag/stubs/1/categories-json.json'))

	for (const externalEvent of [
		Object.assign({}, require('./webhooks/discourse/inbound-tag-tag/01.json'), {
			source: 'discourse'
		})
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event@1.0.0',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: externalEvent
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event@1.0.0',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const user = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-jviotti@latest')

	test.true(user.active)
	test.deepEqual(user.data, {
		email: [ 'foo@bar.com', 'juan@resin.io' ],
		roles: [],
		hash: 'PASSWORDLESS',
		profile: {
			title: 'Software Engineer',
			name: {
				first: 'Juan'
			}
		}
	})
})

scenario.run(avaTest, {
	integration: require('../../../lib/sync/integrations/discourse'),
	scenarios: require('./webhooks/discourse'),
	baseUrl: 'https://forums.balena.io',
	stubRegex: /.*/,
	source: 'discourse',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		const params = querystring.parse(url.parse(request.path).query)
		return params.api_key === self.options.token.api &&
			params.api_username === self.options.token.username
	}
})

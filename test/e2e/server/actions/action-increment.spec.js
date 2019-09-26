/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../../sdk/helpers')
const environment = require('../../../../lib/environment')

ava.before(async (test) => {
	await helpers.before(test)

	const session = await test.context.sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password
	})

	test.context.token = session.id
})

ava.after(helpers.after)

ava.beforeEach(async (test) => {
	await helpers.beforeEach(test, test.context.token)
})

ava.afterEach(helpers.afterEach)

ava.serial('should increment a card value using action-increment', async (test) => {
	const admin = await test.context.sdk.card.get('user-admin')

	const session = await test.context.sdk.card.create({
		type: 'session',
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		version: '1.0.0',
		data: {
			actor: admin.id
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'card',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				reason: null,
				properties: {
					slug: test.context.generateRandomSlug({
						prefix: 'increment-test'
					})
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const card = result1.response.data

	await test.context.http(
		'POST', '/api/v2/action', {
			card: card.id,
			type: card.type,
			action: 'action-increment',
			arguments: {
				reason: null,
				path: [
					'data',
					'count'
				]
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const updatedCard1 = await test.context.sdk.card.get(card.id)
	test.is(updatedCard1.data.count, 1)

	await test.context.http(
		'POST', '/api/v2/action', {
			card: card.id,
			type: card.type,
			action: 'action-increment',
			arguments: {
				reason: null,
				path: [
					'data',
					'count'
				]
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const updatedCard2 = await test.context.sdk.card.get(card.id)
	test.is(updatedCard2.data.count, 2)
})

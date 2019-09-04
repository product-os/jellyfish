/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

ava.serial('should increment a card value using action-increment', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
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

	const updatedCard1 = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, card.id, {
			type: 'card'
		})

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

	const updatedCard2 = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, card.id, {
			type: 'card'
		})

	test.is(updatedCard2.data.count, 2)
})

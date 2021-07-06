/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuidv4
} = require('uuid')
const {
	getSdk
} = require('@balena/jellyfish-client-sdk')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const helpers = require('../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

const reply = async (test, thread, message) => {
	const userType = await test.context.sdk.card.get('user@1.0.0')
	const username = uuidv4()
	const password = uuidv4()
	const email = `${uuidv4()}@test.test`

	await test.context.sdk.action({
		card: userType.id,
		action: 'action-create-user@1.0.0',
		type: userType.type,
		arguments: {
			username: `user-${username}`,
			password,
			email
		}
	})

	const sdk = getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`
	})

	await sdk.auth.login({
		username,
		password
	})

	return sdk.event.create({
		target: thread,
		type: 'message',
		slug: `message-${uuidv4()}`,
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message
		}
	})
}

ava('Should generate a notification if message is added to subscribed thread', async (test) => {
	const {
		sdk
	} = test.context

	const thread = await sdk.card.create({
		type: 'support-thread@1.0.0',
		slug: `support-thread-${uuidv4()}`,
		data: {
			product: 'jellyfish',
			status: 'open'
		}
	})

	const subscription = await sdk.card.create({
		slug: `subscription-${uuidv4()}`,
		name: 'Subscription to foo',
		type: 'subscription@1.0.0',
		data: {}
	})

	await sdk.card.link(thread, subscription, 'has attached')

	const message = await sdk.event.create({
		target: thread,
		type: 'message',
		slug: `message-${uuidv4()}`,
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message: 'Message text'
		}
	})

	await test.throwsAsync(test.context.waitForMatch({
		type: 'object',
		properties: {
			type: {
				const: 'notification@1.0.0'
			}
		},
		required: [
			'type'
		],
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: message.id
					}
				},
				required: [
					'id'
				]
			}
		}
	}, 3), null, 'Should not generate notification to the sender')

	const response = await reply(
		test,
		thread,
		'Response from other user'
	)

	const notification = await test.context.waitForMatch({
		type: 'object',
		properties: {
			type: {
				const: 'notification@1.0.0'
			}
		},
		required: [
			'type'
		],
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: response.id
					}
				},
				required: [
					'id'
				]
			}
		}
	})

	test.truthy(
		notification,
		'Should generate notification for user who received the message'
	)
})

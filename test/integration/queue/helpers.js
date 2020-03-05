/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const uuid = require('../../../lib/uuid')
const helpers = require('../core/helpers')
const Consumer = require('../../../lib/queue').Consumer
const Producer = require('../../../lib/queue').Producer
const actionLibrary = require('../../../lib/action-library')
const queueErrors = require('../../../lib/queue/errors')

exports.beforeEach = async (test, options) => {
	await helpers.beforeEach(test, options && {
		suffix: options.suffix
	})
	test.context.jellyfish = test.context.kernel
	test.context.session = test.context.jellyfish.sessions.admin

	const session = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, test.context.session)
	test.context.actor = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, session.data.actor)

	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		require('../../../apps/server/default-cards/contrib/message.json'))
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		require('../../../apps/server/default-cards/contrib/role-user-community.json'))

	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-create-card'].card)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-create-event'].card)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-set-add'].card)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-create-user'].card)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-create-session'].card)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-update-card'].card)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-delete-card'].card)

	test.context.queue = {}
	test.context.queue.errors = queueErrors

	test.context.queue.consumer = new Consumer(
		test.context.jellyfish,
		test.context.session)

	const consumedActionRequests = []

	await test.context.queue.consumer.initializeWithEventHandler(test.context.context, (actionRequest) => {
		consumedActionRequests.push(actionRequest)
	})

	test.context.queueActor = await uuid.random()

	test.context.dequeue = async (times = 50) => {
		if (consumedActionRequests.length === 0) {
			if (times <= 0) {
				return null
			}

			await Bluebird.delay(10)
			return test.context.dequeue(times - 1)
		}

		return consumedActionRequests.shift()
	}

	test.context.queue.producer = new Producer(
		test.context.jellyfish,
		test.context.session)

	await test.context.queue.producer.initialize(test.context.context)
}

exports.afterEach = async (test) => {
	if (test.context.queue) {
		await test.context.queue.consumer.cancel()
	}

	if (test.context.jellyfish) {
		await helpers.afterEach(test)
	}
}

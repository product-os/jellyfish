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
const environment = require('../../../lib/environment')
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

	const rabbitmqOptions = Object.assign({}, environment.rabbitmq, {
		queueName: `test_${await uuid.random()}`
	}, options)

	test.context.queue.consumer = new Consumer(
		test.context.jellyfish,
		test.context.session,
		rabbitmqOptions)

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

			await Bluebird.delay(1)
			return test.context.dequeue(times - 1)
		}

		return consumedActionRequests.shift()
	}

	test.context.queue.producer = new Producer(
		test.context.jellyfish,
		test.context.session,
		rabbitmqOptions)

	await test.context.queue.producer.initialize(test.context.context)
}

exports.afterEach = async (test) => {
	await test.context.queue.consumer.close()
	await test.context.queue.producer.close()
	await helpers.afterEach(test)
}

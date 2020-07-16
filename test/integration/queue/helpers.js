/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const uuid = require('@balena/jellyfish-uuid')
const helpers = require('../core/helpers')
const defaultCards = require('../../../apps/server/default-cards')
const Consumer = require('@balena/jellyfish-queue').Consumer
const Producer = require('@balena/jellyfish-queue').Producer
const actionLibrary = require('../../../lib/action-library')
const queueErrors = require('@balena/jellyfish-queue').errors
const utils = require('../utils')

exports.before = async (test, options) => {
	await helpers.before(test, options && {
		suffix: options.suffix
	})
	test.context.jellyfish = test.context.kernel
	test.context.session = test.context.jellyfish.sessions.admin

	const session = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, test.context.session)
	test.context.actor = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, session.data.actor)

	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		defaultCards.message)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		defaultCards.roleUserCommunity)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		defaultCards.passwordReset)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		defaultCards.firstTimeLogin)
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
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-send-email'].card)

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
	test.context.generateRandomSlug = utils.generateRandomSlug
	test.context.generateRandomID = utils.generateRandomID
}

exports.after = async (test) => {
	if (test.context.queue) {
		await test.context.queue.consumer.cancel()
	}

	if (test.context.jellyfish) {
		await helpers.after(test)
	}
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const helpers = require('../core/helpers')
const Queue = require('../../../lib/queue')
const actionLibrary = require('../../../lib/action-library')

exports.beforeEach = async (test, options = {}) => {
	await helpers.beforeEach(test, {
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

	test.context.queue = new Queue(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		options)

	test.context.queue.once('error', (error) => {
		throw error
	})

	await test.context.queue.initialize(test.context.context)

	test.context.queueActor = uuid()

	test.context.dequeue = async (context, actor, times = 50) => {
		const request = await test.context.queue.dequeue(
			test.context.context, test.context.queueActor)

		if (!request) {
			if (times <= 0) {
				return null
			}

			await Bluebird.delay(1)
			return test.context.dequeue(context, actor, times - 1)
		}

		return request
	}
}

exports.afterEach = async (test) => {
	await test.context.queue.destroy()
	await helpers.afterEach(test)
}

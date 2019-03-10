/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const helpers = require('../core/helpers')
const Queue = require('../../../lib/queue')
const actionLibrary = require('../../../lib/action-library')

exports.jellyfish = {
	beforeEach: async (test) => {
		await helpers.jellyfish.beforeEach(test)
		test.context.session = test.context.jellyfish.sessions.admin

		const session = await test.context.jellyfish.getCardById(test.context.context, test.context.session, test.context.session)
		test.context.actor = await test.context.jellyfish.getCardById(
			test.context.context, test.context.session, session.data.actor)

		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/message.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/account.json'))

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
	},

	afterEach: async (test) => {
		await helpers.jellyfish.afterEach(test)
	}
}

exports.queue = {
	beforeEach: async (test, options = {}) => {
		await exports.jellyfish.beforeEach(test)
		test.context.queue = new Queue(
			test.context.context,
			test.context.jellyfish,
			test.context.session,
			actionLibrary,
			options)

		test.context.queue.once('error', (error) => {
			throw error
		})

		await test.context.queue.initialize(test.context.context)
	},
	afterEach: async (test) => {
		await test.context.queue.destroy()
		await exports.jellyfish.afterEach(test)
	}
}

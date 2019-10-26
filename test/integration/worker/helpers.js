/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const Worker = require('../../../lib/worker')
const helpers = require('../queue/helpers')
const errio = require('errio')

exports.jellyfish = {
	beforeEach: async (test) => {
		await helpers.queue.beforeEach(test)

		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../lib/worker/cards/update'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../lib/worker/cards/create'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../lib/worker/cards/triggered-action'))
	},

	afterEach: async (test) => {
		await helpers.queue.afterEach(test)
	}
}

exports.worker = {
	beforeEach: async (test, actionLibrary, options = {}) => {
		await helpers.queue.beforeEach(test, {
			enablePriorityBuffer: true,
			suffix: options.suffix
		})

		test.context.worker = new Worker(
			test.context.jellyfish,
			test.context.session,
			Object.assign({
				// For testing purposes
				'action-test-originator': {
					card: Object.assign({}, actionLibrary['action-create-card'].card, {
						slug: 'action-test-originator'
					}),
					handler: async (session, context, card, request) => {
						request.arguments.properties.data = request.arguments.properties.data || {}
						request.arguments.properties.data.originator = request.originator
						return actionLibrary['action-create-card']
							.handler(session, context, card, request)
					}
				}
			}, actionLibrary),
			test.context.queue)
		await test.context.worker.initialize(test.context.context)

		test.context.flush = async (session, expect = 0) => {
			const request = await test.context.queue.dequeue(
				test.context.context, test.context.worker.getId())
			if (!request) {
				if (expect <= 0) {
					return
				}

				// Don't retry synchronously, otherwise we might
				// not give any processor space to the network
				// part of things.
				await Bluebird.delay(1)

				await test.context.flush(session, expect)
				return
			}

			const result = await test.context.worker.execute(session, request)

			if (result.error) {
				const Constructor = test.context.worker.errors[result.data.name] ||
					test.context.queue.errors[result.data.name] ||
					test.context.jellyfish.errors[result.data.name] ||
					Error

				const error = new Constructor(result.data.message)
				error.stack = errio.fromObject(result.data).stack
				throw error
			}

			await test.context.flush(session, expect - 1)
		}
	},
	afterEach: helpers.queue.afterEach
}

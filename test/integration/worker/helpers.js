/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Worker = require('@balena/jellyfish-worker').Worker
const helpers = require('../queue/helpers')
const errio = require('errio')

exports.jellyfish = {
	before: async (test) => {
		await helpers.before(test)

		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('@balena/jellyfish-worker').CARDS.update)
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('@balena/jellyfish-worker').CARDS.create)
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('@balena/jellyfish-worker').CARDS['triggered-action'])
	},

	after: async (test) => {
		await helpers.after(test)
	}
}

exports.worker = {
	before: async (test, actionLibrary, options = {}) => {
		await helpers.before(test, {
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
			test.context.queue.consumer,
			test.context.queue.producer)
		await test.context.worker.initialize(test.context.context)

		test.context.flush = async (session) => {
			const request = await test.context.dequeue()

			if (!request) {
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

			// Rerun to flush actions caused by triggers
			await test.context.flush(session)
		}

		test.context.processAction = async (session, action) => {
			const createRequest = await test.context.queue.producer.enqueue(
				test.context.worker.getId(),
				session,
				action
			)
			await test.context.flush(session)
			return test.context.queue.producer.waitResults(test.context, createRequest)
		}
	},
	after: helpers.after
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const helpers = require('../backend-helpers')
const uuid = require('@balena/jellyfish-uuid')
const Consumer = require('@balena/jellyfish-queue').Consumer
const Producer = require('@balena/jellyfish-queue').Producer
const Worker = require('@balena/jellyfish-worker').Worker
const actionLibrary = require('@balena/jellyfish-action-library')
const queueErrors = require('@balena/jellyfish-queue').errors
const utils = require('../utils')
const errio = require('errio')

const before = async (test, options) => {
	await helpers.before(test, options && {
		suffix: options.suffix
	})

	test.context.defaultCards = utils.loadDefaultCards(test.context.context)

	test.context.jellyfish = test.context.kernel
	test.context.session = test.context.jellyfish.sessions.admin

	const session = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, test.context.session)
	test.context.actor = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, session.data.actor)

	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		test.context.defaultCards.message)
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		test.context.defaultCards['role-user-community'])
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		test.context.defaultCards['password-reset'])
	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		test.context.defaultCards['first-time-login'])
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

const after = async (test) => {
	if (test.context.queue) {
		await test.context.queue.consumer.cancel()
	}

	if (test.context.jellyfish) {
		await helpers.after(test)
	}
}

exports.jellyfish = {
	before: async (test) => {
		await before(test)

		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('@balena/jellyfish-worker').CARDS.update)
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('@balena/jellyfish-worker').CARDS.create)
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('@balena/jellyfish-worker').CARDS['triggered-action'])
	},

	after: async (test) => {
		await after(test)
	}
}

exports.worker = {
	before: async (test, options = {}) => {
		await before(test, {
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
				throw new Error('No message dequeued')
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
	after
}

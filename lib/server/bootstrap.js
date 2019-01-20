/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Bluebird = require('bluebird')
const fs = require('fs')
const fastEquals = require('fast-equals')
const _ = require('lodash')

const logger = require('../logger').getLogger(__filename)
const core = require('../core')
const Queue = require('../queue')

const actionServer = require('./action-server')
const errorReporter = require('./error-reporter')
const configuration = require('./configuration')
const cardLoader = require('./card-loader')

const {
	createWebServer
} = require('./web-server')

module.exports = async (context) => {
	const jellyfish = await core.create(context, {
		backend: {
			host: configuration.database.host,
			port: configuration.database.port,
			user: configuration.database.user,
			password: configuration.database.password,
			certificate: configuration.database.certificate,
			database: configuration.database.name,
			buffer: configuration.database.pool.minimumSize,
			max: configuration.database.pool.maximumSize
		}
	})

	const queue = new Queue(context, jellyfish, jellyfish.sessions.admin)
	await queue.initialize(context)

	const mainWorkerContext = {
		id: 'WORKER'
	}

	const workerManager = await actionServer.start(
		queue,
		mainWorkerContext,
		jellyfish,
		jellyfish.sessions.admin,
		_.noop,
		(error) => {
			console.log('Caught error in action server')
			console.error(error)
			errorReporter.reportException(mainWorkerContext, error)

			// TODO: We should remove this.
			// This is band-aid to make the server crash if the worker
			// crashes, so that the service gets restarted.
			// The proper solution is to decouple the worker from the
			// main server.
			setTimeout(() => {
				process.exit(1)
			}, 1000)
		}
	)

	await Bluebird.each([
		// Types
		await cardLoader.loadCard('default-cards/contrib/ping.json'),
		await cardLoader.loadCard('default-cards/contrib/org.json'),
		await cardLoader.loadCard('default-cards/contrib/todo.json'),

		// Triggered actions
		await cardLoader.loadCard('default-cards/contrib/triggered-action-create-join-org.json'),
		await cardLoader.loadCard('default-cards/contrib/triggered-action-hangouts-link.json'),
		await cardLoader.loadCard('default-cards/contrib/triggered-action-integration-github-import-event.json'),
		await cardLoader.loadCard('default-cards/contrib/triggered-action-integration-github-mirror-event.json'),
		await cardLoader.loadCard('default-cards/contrib/triggered-action-integration-front-import-event.json'),
		await cardLoader.loadCard('default-cards/contrib/triggered-action-integration-front-mirror-event.json'),

		// Internal views
		await cardLoader.loadCard('default-cards/contrib/view-active-triggered-actions.json'),
		await cardLoader.loadCard('default-cards/contrib/view-active.json'),
		await cardLoader.loadCard('default-cards/contrib/view-non-executed-action-requests.json'),

		// Roles
		await cardLoader.loadCard('default-cards/contrib/view-read-user-community.json'),
		await cardLoader.loadCard('default-cards/contrib/view-read-user-guest.json'),
		await cardLoader.loadCard('default-cards/contrib/view-write-user-guest.json')
	], async (card) => {
		const existingCard = await jellyfish.getCardBySlug(context, jellyfish.sessions.admin, card.slug, {
			type: card.type
		})

		if (fastEquals.deepEqual(_.omit(card, 'links'), _.omit(existingCard, [ 'id', 'links' ]))) {
			logger.info(context, 'Skipping unchanged default card', {
				slug: card.slug,
				type: card.type
			})

			return null
		}

		logger.info(context, 'Inserting default card', {
			slug: card.slug,
			type: card.type
		})

		return jellyfish.insertCard(context, jellyfish.sessions.admin, card, {
			override: true
		})
	})

	const guestUser = await jellyfish.insertCard(
		context,
		jellyfish.sessions.admin,
		await cardLoader.loadCard('default-cards/contrib/user-guest.json'),
		{
			override: true
		}
	)

	const guestUserSession = await jellyfish.insertCard(context, jellyfish.sessions.admin, jellyfish.defaults({
		slug: 'session-guest',
		version: '1.0.0',
		type: 'session',
		data: {
			actor: guestUser.id
		}
	}), {
		override: true
	})

	logger.info(context, 'Done setting up guest session')
	jellyfish.sessions.guest = guestUserSession.id
	logger.info(context, 'Loading default cards using worker')

	// Load balena org module
	const balenaCards = await Bluebird.all(fs.readdirSync('./default-cards/balena').map((file) => {
		return cardLoader.loadCard(`default-cards/balena/${file}`)
	}))

	await Bluebird.each([
		await cardLoader.loadCard('default-cards/contrib/account.json'),
		await cardLoader.loadCard('default-cards/contrib/external-event.json'),
		await cardLoader.loadCard('default-cards/contrib/message.json'),
		await cardLoader.loadCard('default-cards/contrib/whisper.json'),
		await cardLoader.loadCard('default-cards/contrib/changelog.json'),
		await cardLoader.loadCard('default-cards/contrib/issue.json'),
		await cardLoader.loadCard('default-cards/contrib/pull-request.json'),
		await cardLoader.loadCard('default-cards/contrib/support-issue.json'),
		await cardLoader.loadCard('default-cards/contrib/support-thread.json'),
		await cardLoader.loadCard('default-cards/contrib/thread.json'),

		// User facing views
		await cardLoader.loadCard('default-cards/contrib/view-all-views.json'),
		await cardLoader.loadCard('default-cards/contrib/view-my-alerts.json'),
		await cardLoader.loadCard('default-cards/contrib/view-my-mentions.json'),
		await cardLoader.loadCard('default-cards/contrib/view-my-orgs.json'),
		await cardLoader.loadCard('default-cards/contrib/view-my-todo-items.json'),

		// Balena org cards
		...balenaCards
	], async (card) => {
		const typeCard = await jellyfish.getCardBySlug(context, jellyfish.sessions.admin, card.type, {
			type: 'type'
		})

		const existingCard = await jellyfish.getCardBySlug(context, jellyfish.sessions.admin, card.slug, {
			type: card.type
		})

		if (fastEquals.deepEqual(_.omit(card, 'links'), _.omit(existingCard, [ 'id', 'links' ]))) {
			return null
		}

		logger.info(context, 'Inserting default card using worker', {
			slug: card.slug,
			type: card.type
		})

		return queue.enqueue(jellyfish.sessions.admin, {
			action: 'action-upsert-card',
			card: typeCard.id,
			type: typeCard.type,
			context,
			arguments: {
				properties: _.omit(card, [ 'type' ])
			}
		})
	})

	await actionServer.flush(
		mainWorkerContext, jellyfish, jellyfish.sessions.admin, workerManager, queue)

	const server = await createWebServer(context, jellyfish, queue, configuration)
	return {
		jellyfish,
		port: server.port,
		queue,
		close: async () => {
			await server.stop()
			await workerManager.stop(mainWorkerContext)
			await jellyfish.disconnect(context)
		}
	}
}

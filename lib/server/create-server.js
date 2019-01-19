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
const logger = require('../logger').getLogger(__filename)
const {
	deepEqual
} = require('fast-equals')
const _ = require('lodash')
const actionServer = require('./action-server')
const {
	loadCard
} = require('./card-loader')
const core = require('../core')
const Queue = require('../queue')
const {
	getConfig
} = require('./config')
const {
	bindRoutes
} = require('./routes')
const {
	createWebServer
} = require('./web-server')
const errorReporter = require('./error-reporter')

exports.createServer = async (context, options) => {
	const startDate = new Date()
	logger.info(context, 'Starting server', {
		time: startDate.getTime()
	})

	const config = getConfig(options)

	const jellyfish = await core.create(context, {
		backend: {
			host: config.dbHost,
			port: config.dbPort,
			user: config.dbUser,
			password: config.dbPassword,
			certificate: config.dbCert,
			database: config.database,
			buffer: config.minPoolElements,
			max: config.maxPoolElements
		}
	})

	const mainWorkerContext = {
		id: 'WORKER'
	}

	const queue = new Queue(context, jellyfish, jellyfish.sessions.admin)
	await queue.initialize(context)
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
		await loadCard('default-cards/contrib/action-create-card.json'),
		await loadCard('default-cards/contrib/action-create-event.json'),
		await loadCard('default-cards/contrib/action-delete-card.json'),
		await loadCard('default-cards/contrib/action-set-add.json'),
		await loadCard('default-cards/contrib/action-update-card.json'),
		await loadCard('default-cards/contrib/action-upsert-card.json'),
		await loadCard('default-cards/contrib/ping.json'),
		await loadCard('default-cards/contrib/account.json'),
		await loadCard('default-cards/contrib/external-event.json'),
		await loadCard('default-cards/contrib/message.json'),
		await loadCard('default-cards/contrib/org.json'),
		await loadCard('default-cards/contrib/todo.json'),
		await loadCard('default-cards/contrib/whisper.json'),

		// Triggered actions
		await loadCard('default-cards/contrib/triggered-action-create-join-org.json'),
		await loadCard('default-cards/contrib/triggered-action-hangouts-link.json'),

		// Internal views
		await loadCard('default-cards/contrib/view-active-triggered-actions.json'),
		await loadCard('default-cards/contrib/view-active.json'),
		await loadCard('default-cards/contrib/view-non-executed-action-requests.json'),

		// Roles
		await loadCard('default-cards/contrib/view-read-user-community.json'),
		await loadCard('default-cards/contrib/view-read-user-guest.json'),
		await loadCard('default-cards/contrib/view-write-user-guest.json'),

		// Integrations
		await loadCard('default-cards/contrib/action-integration-import-event.json'),
		await loadCard('default-cards/contrib/action-integration-github-mirror-event.json'),
		await loadCard('default-cards/contrib/action-integration-front-mirror-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-github-import-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-github-mirror-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-front-import-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-front-mirror-event.json')
	], async (card) => {
		const existingCard = await jellyfish.getCardBySlug(context, jellyfish.sessions.admin, card.slug, {
			type: card.type
		})

		if (deepEqual(_.omit(card, 'links'), _.omit(existingCard, [ 'id', 'links' ]))) {
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
		await loadCard('default-cards/contrib/user-guest.json'),
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
		return loadCard(`default-cards/balena/${file}`)
	}))

	await Bluebird.each([
		await loadCard('default-cards/contrib/action-create-session.json'),
		await loadCard('default-cards/contrib/action-create-user.json'),
		await loadCard('default-cards/contrib/changelog.json'),
		await loadCard('default-cards/contrib/issue.json'),
		await loadCard('default-cards/contrib/pull-request.json'),
		await loadCard('default-cards/contrib/support-issue.json'),
		await loadCard('default-cards/contrib/support-thread.json'),
		await loadCard('default-cards/contrib/thread.json'),

		// User facing views
		await loadCard('default-cards/contrib/view-all-views.json'),
		await loadCard('default-cards/contrib/view-my-alerts.json'),
		await loadCard('default-cards/contrib/view-my-mentions.json'),
		await loadCard('default-cards/contrib/view-my-orgs.json'),
		await loadCard('default-cards/contrib/view-my-todo-items.json'),

		// Balena org cards
		...balenaCards
	], async (card) => {
		const typeCard = await jellyfish.getCardBySlug(context, jellyfish.sessions.admin, card.type, {
			type: 'type'
		})

		const existingCard = await jellyfish.getCardBySlug(context, jellyfish.sessions.admin, card.slug, {
			type: card.type
		})

		if (deepEqual(_.omit(card, 'links'), _.omit(existingCard, [ 'id', 'links' ]))) {
			logger.info(context, 'Inserting default card using worker', {
				slug: card.slug,
				type: card.type
			})

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

	logger.info(context, 'Flushing worker queue')

	await actionServer.flush(
		mainWorkerContext, jellyfish, jellyfish.sessions.admin, workerManager, queue)

	const {
		app,
		port,
		server,
		socketServer
	} = await createWebServer(context, config)
	bindRoutes(jellyfish, queue, app, socketServer)

	const endDate = new Date()
	const timeToBoundPort = endDate.getTime() - startDate.getTime()

	logger.info(context, 'HTTP app listening', {
		time: timeToBoundPort,
		port
	})

	if (timeToBoundPort > 10000) {
		logger.warn(context, 'Slow startup time', {
			time: timeToBoundPort
		})
	}

	// Resolve the jellyfish core after starting the server for testing purposes
	return {
		jellyfish,
		port,
		worker: workerManager,
		queue,
		close: async () => {
			await new Bluebird((resolve) => {
				socketServer.close()
				server.close()
				server.once('close', resolve)
			})

			await workerManager.stop(mainWorkerContext)
			await jellyfish.disconnect(context)
		}
	}
}

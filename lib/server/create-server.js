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
const logger = require('../logger').getLogger('jellyfish:api')
const context = require('../logger/context')
const {
	deepEqual
} = require('fast-equals')
const _ = require('lodash')
const actionServer = require('./action-server')
const {
	loadCard
} = require('../card-loader')
const core = require('../core')
const {
	getConfig
} = require('./config')
const {
	bindRoutes
} = require('./routes')
const {
	createWebServer
} = require('./web-server')

const systemCtx = context.systemContext

exports.createServer = async (options) => {
	const config = getConfig(options)

	const {
		app,
		port,
		server,
		socketServer
	} = await createWebServer(config)

	const jellyfish = await core.create({
		backend: {
			host: config.dbHost,
			port: config.dbPort,
			user: config.dbUser,
			password: config.dbPassword,
			certificate: config.dbCert,
			database: config.database,
			buffer: config.minPoolElements,
			max: config.maxPoolElements
		},
		ctx: systemCtx
	})

	// Insert cards essential to the correct function of the actions server,
	// and cards that don't contain $$formula fields.
	// Any remaining cards will be inserted using the actions server itself
	await Bluebird.each([
		await loadCard('default-cards/contrib/action-create-card.json'),
		await loadCard('default-cards/contrib/action-create-event.json'),
		await loadCard('default-cards/contrib/action-create-session.json'),
		await loadCard('default-cards/contrib/action-create-user.json'),
		await loadCard('default-cards/contrib/action-delete-card.json'),
		await loadCard('default-cards/contrib/action-set-add.json'),
		await loadCard('default-cards/contrib/action-update-card.json'),
		await loadCard('default-cards/contrib/action-upsert-card.json'),
		await loadCard('default-cards/contrib/create.json'),
		await loadCard('default-cards/contrib/execute.json'),
		await loadCard('default-cards/contrib/account.json'),
		await loadCard('default-cards/contrib/triggered-action.json'),
		await loadCard('default-cards/contrib/update.json'),
		await loadCard('default-cards/contrib/external-event.json'),

		// Internal views
		await loadCard('default-cards/contrib/view-active-triggered-actions.json'),
		await loadCard('default-cards/contrib/view-active.json'),
		await loadCard('default-cards/contrib/view-non-executed-action-requests.json'),

		// Roles
		await loadCard('default-cards/contrib/view-read-user-community.json'),
		await loadCard('default-cards/contrib/view-read-user-guest.json'),
		await loadCard('default-cards/contrib/view-read-user-team-admin.json'),
		await loadCard('default-cards/contrib/view-read-user-team.json'),
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
		logger.debug(systemCtx, `${card.slug} upserting ...`)
		const existingCard = await jellyfish.getCardBySlug(jellyfish.sessions.admin, card.slug, {
			type: card.type,
			ctx: systemCtx
		})

		if (deepEqual(_.omit(card, 'links'), _.omit(existingCard, [ 'id', 'links' ]))) {
			logger.debug(systemCtx, `${card.slug} is unchanged, skipping insert`)
			return null
		}

		logger.debug(systemCtx, `Inserting ${card.slug}`)
		return jellyfish.insertCard(jellyfish.sessions.admin, card, {
			override: true,
			ctx: systemCtx
		})
	})

	const guestUser = await jellyfish.insertCard(
		jellyfish.sessions.admin,
		await loadCard('default-cards/contrib/user-guest.json'),
		{
			override: true,
			ctx: systemCtx
		}
	)

	const guestUserSession = await jellyfish.insertCard(jellyfish.sessions.admin, jellyfish.defaults({
		slug: 'session-guest',
		version: '1.0.0',
		type: 'session',
		data: {
			actor: guestUser.id
		}
	}), {
		override: true,
		ctx: systemCtx
	})
	logger.debug(systemCtx, 'Done setting up guest session')
	jellyfish.sessions.guest = guestUserSession.id

	const worker = await actionServer.start(
		jellyfish,
		jellyfish.sessions.admin,
		_.noop,
		(error) => {
			console.log('Caught error in action server')
			console.log(error)
			throw error
		}
	)

	logger.debug(systemCtx, 'Loading default cards using worker')

	// Load balena org module
	const balenaCards = await Bluebird.all(fs.readdirSync('./default-cards/balena').map((file) => {
		return loadCard(`default-cards/balena/${file}`)
	}))

	// Insert remaining contrib cards via the actions worker, allowing
	// $$formula fields to be parsed and cached
	await Bluebird.each([
		// Type cards
		await loadCard('default-cards/contrib/changelog.json'),
		await loadCard('default-cards/contrib/issue.json'),
		await loadCard('default-cards/contrib/pull-request.json'),
		await loadCard('default-cards/contrib/support-thread.json'),
		await loadCard('default-cards/contrib/message.json'),
		await loadCard('default-cards/contrib/whisper.json'),
		await loadCard('default-cards/contrib/org.json'),
		await loadCard('default-cards/contrib/subscription.json'),
		await loadCard('default-cards/contrib/thread.json'),
		await loadCard('default-cards/contrib/todo.json'),

		// User facing views
		await loadCard('default-cards/contrib/view-all-messages.json'),
		await loadCard('default-cards/contrib/view-all-views.json'),
		await loadCard('default-cards/contrib/view-my-alerts.json'),
		await loadCard('default-cards/contrib/view-my-mentions.json'),
		await loadCard('default-cards/contrib/view-my-orgs.json'),
		await loadCard('default-cards/contrib/view-my-todo-items.json'),

		// Triggered actions
		await loadCard('default-cards/contrib/triggered-action-create-join-org.json'),
		await loadCard('default-cards/contrib/triggered-action-hangouts-link.json'),

		// Balena org cards
		...balenaCards
	], async (card) => {
		const typeCard = await jellyfish.getCardBySlug(jellyfish.sessions.admin, card.type, {
			type: 'type',
			ctx: systemCtx
		})

		const existingCard = await jellyfish.getCardBySlug(jellyfish.sessions.admin, card.slug, {
			type: card.type,
			ctx: systemCtx
		})

		if (deepEqual(_.omit(card, 'links'), _.omit(existingCard, [ 'id', 'links' ]))) {
			logger.debug(systemCtx, `${card.slug} is unchanged, skipping insert`)
			return null
		}

		logger.debug(systemCtx, `Inserting ${card.slug}`)

		return worker.insertCard(
			jellyfish.sessions.admin,
			typeCard,
			{
				override: true,
				attachEvents: true
			},
			card
		)
	})

	logger.debug(systemCtx, 'Flushing worker queue')

	await actionServer.flush(jellyfish, jellyfish.sessions.admin, worker)

	bindRoutes(jellyfish, worker, app, socketServer)

	logger.info(systemCtx, `HTTP app listening on port ${port}!`)

	// Resolve the jellyfish core after starting the server for testing purposes
	return {
		jellyfish,
		port,
		worker,
		close: async () => {
			await new Bluebird((resolve) => {
				socketServer.close()
				server.close()
				server.once('close', resolve)
			})

			await worker.stop()
			await jellyfish.disconnect()
		}
	}
}

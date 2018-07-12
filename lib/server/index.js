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
const debug = require('debug')('jellyfish:api')
const _ = require('lodash')
const actionServer = require('../action-server')
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

const createServer = async () => {
	const config = getConfig()

	const {
		app,
		port,
		socketServer
	} = await createWebServer(config)

	const jellyfish = await core.create({
		tables: {
			cards: 'cards',
			requests: 'requests',
			sessions: 'sessions'
		},
		backend: {
			host: config.dbHost,
			port: config.dbPort,
			user: config.dbUser,
			password: config.dbPassword,
			certificate: config.dbCert,
			database: config.database
		}
	})

	// Insert cards essential to the correct function of the actions server,
	// and cards that don't contain $formula fields.
	// Any remaining cards will be inserted using the actions server itself
	await Bluebird.each([
		require('../../default-cards/contrib/action-create-card.json'),
		require('../../default-cards/contrib/action-create-event.json'),
		require('../../default-cards/contrib/action-create-session.json'),
		require('../../default-cards/contrib/action-create-user.json'),
		require('../../default-cards/contrib/action-delete-card.json'),
		require('../../default-cards/contrib/action-restore-card.json'),
		require('../../default-cards/contrib/action-set-add.json'),
		require('../../default-cards/contrib/action-update-card.json'),
		require('../../default-cards/contrib/action-update-email.json'),
		require('../../default-cards/contrib/action-upsert-card.json'),
		require('../../default-cards/contrib/create.json'),
		require('../../default-cards/contrib/event.json'),
		require('../../default-cards/contrib/execute.json'),
		require('../../default-cards/contrib/triggered-action.json'),
		require('../../default-cards/contrib/update.json'),

		// Views
		require('../../default-cards/contrib/view-active-triggered-actions.json'),
		require('../../default-cards/contrib/view-active.json'),
		require('../../default-cards/contrib/view-all-messages.json'),
		require('../../default-cards/contrib/view-all-repos.json'),
		require('../../default-cards/contrib/view-all-users.json'),
		require('../../default-cards/contrib/view-all-views.json'),
		require('../../default-cards/contrib/view-jellyfish-issues.json'),
		require('../../default-cards/contrib/view-my-alerts.json'),
		require('../../default-cards/contrib/view-my-mentions.json'),
		require('../../default-cards/contrib/view-my-todo-items.json'),
		require('../../default-cards/contrib/view-non-executed-action-requests.json'),
		require('../../default-cards/contrib/view-scratchpad.json'),

		// Roles
		require('../../default-cards/contrib/view-read-user-community.json'),
		require('../../default-cards/contrib/view-read-user-guest.json'),
		require('../../default-cards/contrib/view-read-user-team-admin.json'),
		require('../../default-cards/contrib/view-read-user-team.json'),
		require('../../default-cards/contrib/view-write-user-guest.json')
	], (card) => {
		debug(`Inserting ${card.slug}`)
		return jellyfish.insertCard(jellyfish.sessions.admin, card, {
			override: true
		})
	})

	const guestUser = await jellyfish.insertCard(
		jellyfish.sessions.admin,
		require('../../default-cards/contrib/user-guest.json'),
		{
			override: true
		}
	)

	const guestUserSession = await jellyfish.insertCard(jellyfish.sessions.admin, {
		slug: 'session-guest',
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor: guestUser.id
		}
	}, {
		override: true
	})

	jellyfish.sessions.guest = guestUserSession.id

	const worker = await actionServer.start(
		jellyfish,
		jellyfish.sessions.admin,
		_.noop,
		(error) => {
			throw error
		}
	)

	debug('Loading default cards using worker')

	// Insert remaining contrib cards via the actions worker, allowing
	// $formula fields to be parsed and cached
	await Bluebird.each([
		// Type cards
		require('../../default-cards/contrib/issue.json'),
		require('../../default-cards/contrib/message.json'),
		require('../../default-cards/contrib/repo.json'),
		require('../../default-cards/contrib/scratchpad-entry.json'),
		require('../../default-cards/contrib/subscription.json'),
		require('../../default-cards/contrib/thread.json'),
		require('../../default-cards/contrib/todo.json'),

		// Triggered actions
		require('../../default-cards/contrib/triggered-action-hangouts-link.json')
	], async (card) => {
		const typeCard = await jellyfish.getCardBySlug(jellyfish.sessions.admin, card.type)

		debug(`Inserting ${card.slug}`)

		return worker.insertCard(
			jellyfish.sessions.admin,
			typeCard,
			{
				override: true
			},
			card
		)
	})

	debug('Flushing worker queue')

	await actionServer.flush(jellyfish, jellyfish.sessions.admin, worker)

	bindRoutes(jellyfish, worker, app, socketServer)

	debug(`HTTP app listening on port ${port}!`)

	// Resolve the jellyfish core after starting the server for testing purposes
	return {
		jellyfish,
		port
	}
}

module.exports = createServer

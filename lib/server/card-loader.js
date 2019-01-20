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

const _ = require('lodash')
const fs = require('fs')
const fastEquals = require('fast-equals')
const Bluebird = require('bluebird')
const $RefParser = require('json-schema-ref-parser')
const logger = require('../logger').getLogger(__filename)

const loadCard = async (path) => {
	return $RefParser.dereference(path)
}

module.exports = async (context, jellyfish, queue, session) => {
	logger.info(context, 'Setting up guest user')

	const guestUser = await jellyfish.insertCard(
		context, session, await loadCard('default-cards/contrib/user-guest.json'), {
			override: true
		})

	const guestUserSession = await jellyfish.insertCard(
		context, session, jellyfish.defaults({
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
	logger.info(context, 'Setting default cards')

	// TODO: Insert all these cards using a local "special" worker
	// for the main server, so that the main server doesn't require
	// external workers to bootstrap itself.

	await Bluebird.each([
		// Triggered actions
		await loadCard('default-cards/contrib/triggered-action-create-join-org.json'),
		await loadCard('default-cards/contrib/triggered-action-hangouts-link.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-github-import-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-github-mirror-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-front-import-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-front-mirror-event.json'),

		// Internal views
		await loadCard('default-cards/contrib/view-active-triggered-actions.json'),
		await loadCard('default-cards/contrib/view-active.json'),
		await loadCard('default-cards/contrib/view-non-executed-action-requests.json'),

		// Roles
		await loadCard('default-cards/contrib/view-read-user-community.json'),
		await loadCard('default-cards/contrib/view-read-user-guest.json'),
		await loadCard('default-cards/contrib/view-write-user-guest.json')
	], async (card) => {
		const existingCard = await jellyfish.getCardBySlug(context, session, card.slug, {
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

		return jellyfish.insertCard(context, session, card, {
			override: true
		})
	})

	logger.info(context, 'Loading default cards using worker')

	// Load balena org module
	const balenaCards = await Bluebird.all(fs.readdirSync('./default-cards/balena').map((file) => {
		return loadCard(`default-cards/balena/${file}`)
	}))

	await Bluebird.each([
		await loadCard('default-cards/contrib/ping.json'),
		await loadCard('default-cards/contrib/org.json'),
		await loadCard('default-cards/contrib/todo.json'),
		await loadCard('default-cards/contrib/account.json'),
		await loadCard('default-cards/contrib/external-event.json'),
		await loadCard('default-cards/contrib/message.json'),
		await loadCard('default-cards/contrib/whisper.json'),
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
		const typeCard = await jellyfish.getCardBySlug(context, session, card.type, {
			type: 'type'
		})

		const existingCard = await jellyfish.getCardBySlug(context, session, card.slug, {
			type: card.type
		})

		if (fastEquals.deepEqual(_.omit(card, 'links'), _.omit(existingCard, [ 'id', 'links' ]))) {
			return null
		}

		logger.info(context, 'Inserting default card using worker', {
			slug: card.slug,
			type: card.type
		})

		return queue.enqueue(session, {
			action: 'action-upsert-card',
			card: typeCard.id,
			type: typeCard.type,
			context,
			arguments: {
				properties: _.omit(card, [ 'type' ])
			}
		})
	})

	return {
		guestSession: guestUserSession
	}
}

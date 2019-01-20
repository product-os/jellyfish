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
const $RefParser = require('json-schema-ref-parser')
const logger = require('../logger').getLogger(__filename)

const loadCard = async (path) => {
	return $RefParser.dereference(path)
}

module.exports = async (context, jellyfish, worker, session) => {
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

	await Bluebird.each([
		// Roles
		await loadCard('default-cards/contrib/view-read-user-community.json'),
		await loadCard('default-cards/contrib/view-read-user-guest.json'),
		await loadCard('default-cards/contrib/view-write-user-guest.json'),

		// Internal views
		await loadCard('default-cards/contrib/view-active-triggered-actions.json'),
		await loadCard('default-cards/contrib/view-active.json'),
		await loadCard('default-cards/contrib/view-non-executed-action-requests.json'),

		// Types
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

		// Triggered actions
		await loadCard('default-cards/contrib/triggered-action-create-join-org.json'),
		await loadCard('default-cards/contrib/triggered-action-hangouts-link.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-github-import-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-github-mirror-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-front-import-event.json'),
		await loadCard('default-cards/contrib/triggered-action-integration-front-mirror-event.json'),

		// User facing views
		await loadCard('default-cards/contrib/view-all-views.json'),
		await loadCard('default-cards/contrib/view-my-alerts.json'),
		await loadCard('default-cards/contrib/view-my-mentions.json'),
		await loadCard('default-cards/contrib/view-my-orgs.json'),
		await loadCard('default-cards/contrib/view-my-todo-items.json'),

		// Balena org cards
		await loadCard('default-cards/balena/org-balena.json'),
		await loadCard('default-cards/balena/architecture-topic.json'),
		await loadCard('default-cards/balena/os-test-result.json'),
		await loadCard('default-cards/balena/view-all-architecture-topics.json'),
		await loadCard('default-cards/balena/view-all-issues.json'),
		await loadCard('default-cards/balena/view-all-messages.json'),
		await loadCard('default-cards/balena/view-all-support-issues.json'),
		await loadCard('default-cards/balena/view-all-support-threads.json'),
		await loadCard('default-cards/balena/view-all-users.json'),
		await loadCard('default-cards/balena/view-changelogs.json'),
		await loadCard('default-cards/balena/view-os-test-results.json'),
		await loadCard('default-cards/balena/view-product-specs.json'),
		await loadCard('default-cards/balena/view-support-threads-pending-update.json'),
		await loadCard('default-cards/balena/view-support-threads-to-audit.json')
	], async (card) => {
		const typeCard = await jellyfish.getCardBySlug(context, session, card.type, {
			type: 'type'
		})

		logger.info(context, 'Inserting default card using worker', {
			slug: card.slug,
			type: card.type
		})

		return worker.insertCard(context, session, typeCard, {
			override: true,
			attachEvents: true
		}, card)
	})

	return {
		guestSession: guestUserSession
	}
}

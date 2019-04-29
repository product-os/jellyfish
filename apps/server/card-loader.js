/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const path = require('path')
const $RefParser = require('json-schema-ref-parser')
const logger = require('../../lib/logger').getLogger(__filename)

const loadCard = async (cardPath) => {
	return $RefParser.dereference(path.join(__dirname, 'default-cards', cardPath))
}

module.exports = async (context, jellyfish, worker, session) => {
	logger.info(context, 'Setting up guest user')

	const guestUser = await jellyfish.insertCard(
		context, session, await loadCard('contrib/user-guest.json'), {
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
		await loadCard('contrib/view-read-user-community.json'),
		await loadCard('contrib/view-read-user-guest.json'),
		await loadCard('contrib/view-write-user-guest.json'),

		// Internal views
		await loadCard('contrib/view-active-triggered-actions.json'),
		await loadCard('contrib/view-active.json'),
		await loadCard('contrib/view-non-executed-action-requests.json'),

		// Types
		await loadCard('contrib/ping.json'),
		await loadCard('contrib/todo.json'),
		await loadCard('contrib/account.json'),
		await loadCard('contrib/external-event.json'),
		await loadCard('contrib/message.json'),
		await loadCard('contrib/whisper.json'),
		await loadCard('contrib/changelog.json'),
		await loadCard('contrib/issue.json'),
		await loadCard('contrib/pull-request.json'),
		await loadCard('contrib/repository.json'),
		await loadCard('contrib/push.json'),
		await loadCard('contrib/support-issue.json'),
		await loadCard('contrib/support-thread.json'),
		await loadCard('contrib/tag.json'),
		await loadCard('contrib/thread.json'),

		// Triggered actions
		await loadCard('contrib/triggered-action-github-issue-link.json'),
		await loadCard('contrib/triggered-action-hangouts-link.json'),
		await loadCard('contrib/triggered-action-increment-tag.json'),
		await loadCard('contrib/triggered-action-integration-github-import-event.json'),
		await loadCard('contrib/triggered-action-integration-github-mirror-event.json'),
		await loadCard('contrib/triggered-action-integration-front-import-event.json'),
		await loadCard('contrib/triggered-action-integration-front-mirror-event.json'),
		await loadCard('contrib/triggered-action-integration-discourse-import-event.json'),
		await loadCard('contrib/triggered-action-integration-discourse-mirror-event.json'),

		// User facing views
		await loadCard('contrib/view-all-views.json'),
		await loadCard('contrib/view-my-inbox.json'),
		await loadCard('contrib/view-my-orgs.json'),
		await loadCard('contrib/view-my-todo-items.json'),

		// Balena org cards
		await loadCard('balena/org-balena.json'),
		await loadCard('balena/architecture-topic.json'),
		await loadCard('balena/os-test-result.json'),
		await loadCard('balena/view-all-architecture-topics.json'),
		await loadCard('balena/view-all-customers.json'),
		await loadCard('balena/view-all-issues.json'),
		await loadCard('balena/view-all-messages.json'),
		await loadCard('balena/view-all-support-issues.json'),
		await loadCard('balena/view-all-support-threads.json'),
		await loadCard('balena/view-fleetops-support-threads.json'),
		await loadCard('balena/view-backend-support-threads.json'),
		await loadCard('balena/view-customer-success-support-threads.json'),
		await loadCard('balena/view-devices-support-threads.json'),
		await loadCard('balena/view-all-users.json'),
		await loadCard('balena/view-changelogs.json'),
		await loadCard('balena/view-os-test-results.json'),
		await loadCard('balena/view-product-specs.json'),
		await loadCard('balena/view-support-threads-pending-update.json'),
		await loadCard('balena/view-support-threads-to-audit.json')
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
			attachEvents: false
		}, card)
	})

	return {
		guestSession: guestUserSession
	}
}

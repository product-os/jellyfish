/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const path = require('path')
const $RefParser = require('json-schema-ref-parser')
const logger = require('../../lib/logger').getLogger(__filename)
const environment = require('../../lib/environment')

const loadCard = async (cardPath) => {
	return $RefParser.dereference(path.join(__dirname, 'default-cards', cardPath))
}

module.exports = async (context, jellyfish, worker, session) => {
	logger.info(context, 'Setting up guest user')

	const guestUser = await jellyfish.replaceCard(
		context, session, await loadCard('contrib/user-guest.json'))

	const guestUserSession = await jellyfish.replaceCard(
		context, session, jellyfish.defaults({
			slug: 'session-guest',
			version: '1.0.0',
			type: 'session@1.0.0',
			data: {
				actor: guestUser.id
			}
		}))

	logger.info(context, 'Done setting up guest session')
	logger.info(context, 'Setting default cards')

	await Bluebird.each([
		// Roles
		await loadCard('contrib/role-user-community.json'),
		await loadCard('contrib/role-user-guest.json'),
		!environment.isProduction() && await loadCard('contrib/role-user-test.json'),
		await loadCard('contrib/role-user-external-support.json'),

		// Internal views
		await loadCard('contrib/view-active-triggered-actions.json'),
		await loadCard('contrib/view-active.json'),
		await loadCard('contrib/view-non-executed-action-requests.json'),

		// Types
		await loadCard('contrib/account.json'),
		await loadCard('contrib/agenda.json'),
		await loadCard('contrib/changelog.json'),
		await loadCard('contrib/checkin.json'),
		await loadCard('contrib/contact.json'),
		await loadCard('contrib/discussion-topic.json'),
		await loadCard('contrib/email-sequence.json'),
		await loadCard('contrib/external-event.json'),
		await loadCard('contrib/faq.json'),
		await loadCard('contrib/feedback-item.json'),
		await loadCard('contrib/issue.json'),
		await loadCard('contrib/message.json'),
		await loadCard('contrib/opportunity.json'),
		await loadCard('contrib/password-reset.json'),
		await loadCard('contrib/ping.json'),
		await loadCard('contrib/pipeline.json'),
		await loadCard('contrib/product-improvement.json'),
		await loadCard('contrib/product.json'),
		await loadCard('contrib/project.json'),
		await loadCard('contrib/pull-request.json'),
		await loadCard('contrib/push.json'),
		await loadCard('contrib/repository.json'),
		await loadCard('contrib/specification.json'),
		await loadCard('contrib/sales-thread.json'),
		await loadCard('contrib/support-issue.json'),
		await loadCard('contrib/support-thread.json'),
		await loadCard('contrib/tag.json'),
		await loadCard('contrib/thread.json'),
		await loadCard('contrib/view-all-pipelines.json'),
		await loadCard('contrib/whisper.json'),
		await loadCard('contrib/workflow.json'),

		// Triggered actions
		await loadCard('contrib/triggered-action-github-issue-link.json'),
		await loadCard('contrib/triggered-action-hangouts-link.json'),
		await loadCard('contrib/triggered-action-increment-tag.json'),
		await loadCard('contrib/triggered-action-user-contact.json'),
		await loadCard('contrib/triggered-action-integration-import-event.json'),
		await loadCard('contrib/triggered-action-integration-github-mirror-event.json'),
		await loadCard('contrib/triggered-action-integration-front-mirror-event.json'),
		await loadCard('contrib/triggered-action-integration-discourse-mirror-event.json'),
		await loadCard('contrib/triggered-action-integration-outreach-mirror-event.json'),
		await loadCard('contrib/triggered-action-set-user-avatar.json'),
		await loadCard('contrib/triggered-action-support-summary.json'),
		await loadCard('contrib/triggered-action-support-reopen.json'),
		await loadCard('contrib/triggered-action-support-closed-issue-reopen.json'),

		// User facing views
		await loadCard('contrib/view-all-views.json'),
		await loadCard('contrib/view-my-inbox.json'),
		await loadCard('contrib/view-my-orgs.json'),
		await loadCard('contrib/view-all-by-type.json'),

		// Balena org cards
		await loadCard('balena/org-balena.json'),
		await loadCard('balena/os-test-result.json'),
		await loadCard('balena/product-balena-cloud.json'),
		await loadCard('balena/product-jellyfish.json'),
		await loadCard('balena/view-all-agendas.json'),
		await loadCard('balena/view-all-checkins.json'),
		await loadCard('balena/view-all-contacts.json'),
		await loadCard('balena/view-all-customers.json'),
		await loadCard('balena/view-all-faqs.json'),
		await loadCard('balena/view-all-issues.json'),
		await loadCard('balena/view-all-jellyfish-support-threads.json'),
		await loadCard('balena/view-all-messages.json'),
		await loadCard('balena/view-all-opportunities.json'),
		await loadCard('balena/view-all-product-improvements.json'),
		await loadCard('balena/view-all-products.json'),
		await loadCard('balena/view-all-projects.json'),
		await loadCard('balena/view-all-sales-threads.json'),
		await loadCard('balena/view-all-specifications.json'),
		await loadCard('balena/view-all-support-issues.json'),
		await loadCard('balena/view-support-knowledge-base.json'),
		await loadCard('balena/view-all-support-threads.json'),
		await loadCard('balena/view-all-users.json'),
		await loadCard('balena/view-architecture-call-topics.json'),
		await loadCard('balena/view-changelogs.json'),
		await loadCard('balena/view-customer-success-support-threads.json'),
		await loadCard('balena/view-devices-support-threads.json'),
		await loadCard('balena/view-fleetops-support-threads.json'),
		await loadCard('balena/view-os-test-results.json'),
		await loadCard('balena/view-product-specs.json'),
		await loadCard('balena/view-security-support-threads.json'),
		await loadCard('balena/view-support-threads-pending-update.json'),
		await loadCard('balena/view-support-threads-to-audit.json'),
		await loadCard('balena/view-workflows.json')
	], async (card) => {
		if (!card) {
			return
		}

		const typeCard = await jellyfish.getCardBySlug(
			context, session, `${card.type}@${card.version}`)

		logger.info(context, 'Inserting default card using worker', {
			slug: card.slug,
			type: card.type
		})

		await worker.replaceCard(context, session, typeCard, {
			attachEvents: false
		}, card)

		logger.info(context, 'Inserted default card using worker', {
			slug: card.slug,
			type: card.type
		})
	})

	return {
		guestSession: guestUserSession
	}
}

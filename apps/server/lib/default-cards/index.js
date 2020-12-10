/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

const defaultCardMixins = require('./mixins')

module.exports = ({
	mixin, initialize, ...coreMixins
}) => {
	const mixins = {
		mixin,
		...coreMixins,
		...defaultCardMixins
	}

	const defaultCards = {
		// Users
		userGuest: require('./contrib/user-guest.json'),

		// Roles
		roleUserCommunity: require('./contrib/role-user-community.json'),
		roleUserOperator: require('./contrib/role-user-operator.json'),
		roleUserGuest: require('./contrib/role-user-guest.json'),
		roleUserTest: require('./contrib/role-user-test.json'),
		roleUserExternalSuport: require('./contrib/role-user-external-support.json'),

		// Internal views
		viewActiveTriggeredActions: require('./contrib/view-active-triggered-actions.json'),
		viewActive: require('./contrib/view-active.json'),
		viewNonExecutedActionRequests: require('./contrib/view-non-executed-action-requests.json'),

		// Types
		account: require('./contrib/account.js')(mixins),
		blogPost: require('./contrib/blog-post.js')(mixins),
		brainstormCall: require('./contrib/brainstorm-call.json'),
		brainstormTopic: require('./contrib/brainstorm-topic')(mixins),
		changelog: require('./contrib/changelog.js')(mixins),
		checkin: require('./contrib/checkin.js')(mixins),
		contract: require('./contrib/contact.js')(mixins),
		emailSequence: require('./contrib/email-sequence.json'),
		externalEvent: require('./contrib/external-event.json'),
		faq: require('./contrib/faq.json'),
		feedbackItem: require('./contrib/feedback-item.json'),
		formResponse: require('./contrib/form-response.json'),
		formResponseCuration: require('./contrib/form-response-curation.json'),
		userFeedback: require('./contrib/user-feedback.json'),
		issue: require('./contrib/issue.js')(mixins),
		message: require('./contrib/message.js')(mixins),
		firstTimeLogin: require('./contrib/first-time-login.json'),
		opportunity: require('./contrib/opportunity.js')(mixins),
		passwordReset: require('./contrib/password-reset.json'),
		pattern: require('./contrib/pattern.js')(mixins),
		ping: require('./contrib/ping.json'),
		pipeline: require('./contrib/pipeline.json'),
		milestone: require('./contrib/milestone.json'),
		notification: require('./contrib/notification.json'),
		productImprovement: require('./contrib/product-improvement')(mixins),
		product: require('./contrib/product.json'),
		project: require('./contrib/project.json'),
		pullRequest: require('./contrib/pull-request')(mixins),
		push: require('./contrib/push.json'),
		repository: require('./contrib/repository.js')(mixins),
		specification: require('./contrib/specification.json'),
		subscription: require('./contrib/subscription.json'),
		salesThread: require('./contrib/sales-thread.js')(mixins),
		supportIssue: require('./contrib/support-issue')(mixins),
		supportThread: require('./contrib/support-thread')(mixins),
		tag: require('./contrib/tag.json'),
		thread: require('./contrib/thread')(mixins),
		viewAllPipelines: require('./contrib/view-all-pipelines.json'),
		whisper: require('./contrib/whisper.js')(mixins),
		workflow: require('./contrib/workflow.json'),
		webPushSubscription: require('./contrib/web-push-subscription.json'),
		group: require('./contrib/group.json'),
		summary: require('./contrib/summary.json'),

		// Triggered actions
		triggeredActionGitHubIssueLink: require('./contrib/triggered-action-github-issue-link.json'),
		triggeredActionHangoutsLink: require('./contrib/triggered-action-hangouts-link.json'),
		triggeredActionIncrementTag: require('./contrib/triggered-action-increment-tag.json'),
		triggeredActionUserContact: require('./contrib/triggered-action-user-contact.json'),
		triggeredActionIntegrationImportEvent: require('./contrib/triggered-action-integration-import-event.json'),
		triggeredActionIntegrationGitHubMirrorEvent: require(
			'./contrib/triggered-action-integration-github-mirror-event.json'),
		triggeredActionIntegrationFrontMirrorEvent: require(
			'./contrib/triggered-action-integration-front-mirror-event.json'),
		triggeredActionIntegrationDiscourseMirrorEvent: require(
			'./contrib/triggered-action-integration-discourse-mirror-event.json'),
		triggeredActionIntegrationOutreactMirrorEvent: require(
			'./contrib/triggered-action-integration-outreach-mirror-event.json'),
		triggeredActionSetUserAvatar: require('./contrib/triggered-action-set-user-avatar.json'),
		triggeredActionSupportSummary: require('./contrib/triggered-action-support-summary.json'),
		triggeredActionSupportReopen: require('./contrib/triggered-action-support-reopen.json'),
		triggeredActionSupportClosedIssueReopen: require('./contrib/triggered-action-support-closed-issue-reopen.json'),
		triggeredActionSupportClosedPullRequestReopen:
			require('./contrib/triggered-action-support-closed-pull-request-reopen.json'),
		triggeredActionSyncThreadPostLinkWhisper: require(
			'./contrib/triggered-action-sync-thread-post-link-whisper.json'),
		triggeredActionUpdateEventEditedAt: require('./contrib/triggered-action-update-event-edited-at.json'),

		// User facing views
		viewAllViews: require('./contrib/view-all-views.json'),
		viewMyOrgs: require('./contrib/view-my-orgs.json'),
		viewMyConversations: require('./contrib/view-my-conversations.json'),
		viewAllByType: require('./contrib/view-all-by-type.json'),
		viewAllPullRequests: require('./contrib/view-all-pull-requests.json'),

		// Balena org cards
		orgBalena: require('./balena/org-balena.json'),
		osTestResult: require('./balena/os-test-result')(mixins),
		productBalenaCloud: require('./balena/product-balena-cloud.json'),
		productJellyfish: require('./balena/product-jellyfish.json'),
		viewAllBlogPosts: require('./balena/view-all-blog-posts.json'),
		viewAllUsersFeedback: require('./balena/view-all-users-feedback.json'),
		viewNewUsersFeedback: require('./balena/view-new-users-feedback.json'),
		viewCuratedUsersFeedback: require('./balena/view-curated-users-feedback.json'),
		viewTypeformResponses: require('./balena/view-typeform-responses.json'),
		viewCurateTypeformResponses: require('./balena/view-curate-typeform-responses.json'),
		viewAllBrainstormCalls: require('./balena/view-all-brainstorm-calls.json'),
		viewAllBrainstormTopics: require('./balena/view-all-brainstorm-topics.json'),
		viewAllCheckins: require('./balena/view-all-checkins.json'),
		viewAllContacts: require('./balena/view-all-contacts.json'),
		viewAllCustomers: require('./balena/view-all-customers.json'),
		viewAllFaqs: require('./balena/view-all-faqs.json'),
		viewAllGroups: require('./balena/view-all-groups.json'),
		viewAllIssues: require('./balena/view-all-issues.json'),
		viewAllJellyfishSupportThreads: require('./balena/view-all-jellyfish-support-threads.json'),
		viewAllMessages: require('./balena/view-all-messages.json'),
		viewAllOpportunities: require('./balena/view-all-opportunities.json'),
		viewMyOpportunities: require('./balena/view-my-opportunities.json'),
		viewAllPatterns: require('./balena/view-all-patterns.json'),
		viewAllProductImprovements: require('./balena/view-all-product-improvements.json'),
		viewAllProducts: require('./balena/view-all-products.json'),
		viewAllProjects: require('./balena/view-all-projects.json'),
		viewAllSalesThreads: require('./balena/view-all-sales-threads.json'),
		viewAllSpecifications: require('./balena/view-all-specifications.json'),
		viewAllSupportIssues: require('./balena/view-all-support-issues.json'),
		viewBalenaChat: require('./balena/view-balena-chat.json'),
		viewSupportKnowledgeBase: require('./balena/view-support-knowledge-base.json'),
		viewSupportThreadsParticipation: require('./balena/view-support-threads-participation.json'),
		viewAllForumThreads: require('./balena/view-all-forum-threads.json'),
		viewAllSupportThreads: require('./balena/view-all-support-threads.json'),
		viewPaidSupportThreads: require('./balena/view-paid-support-threads.json'),
		viewAllUsers: require('./balena/view-all-users.json'),
		viewChangelogs: require('./balena/view-changelogs.json'),
		viewCustomerSuccessSuppotThreads: require('./balena/view-customer-success-support-threads.json'),
		viewDevicesSupportThreads: require('./balena/view-devices-support-threads.json'),
		viewFleetopsSupportThreads: require('./balena/view-fleetops-support-threads.json'),
		viewOSTestResults: require('./balena/view-os-test-results.json'),
		viewProductSpecs: require('./balena/view-product-specs.json'),
		viewSecuritySupportThreads: require('./balena/view-security-support-threads.json'),
		viewSupportThreadsPendingUpdate: require('./balena/view-support-threads-pending-update.json'),
		viewSupportThreadsToAudit: require('./balena/view-support-threads-to-audit.json'),
		viewWorkflows: require('./balena/view-workflows.json'),

		// ProductOS
		image: require('./product-os/image.json'),
		imageSource: require('./product-os/image-source.json'),

		roleLoop: require('./product-os/role-loop.json'),
		roleTransformerWorker: require('./product-os/role-transformer-worker.json'),
		task: require('./product-os/task'),
		transformer: require('./product-os/transformer.json'),
		transformerWorker: require('./product-os/transformer-worker.json'),
		viewTransformerWorkers: require('./product-os/view-all-transformer-workers.json'),
		viewTransformers: require('./product-os/view-all-transformers.json')
	}

	return _.mapValues(defaultCards, initialize)
}

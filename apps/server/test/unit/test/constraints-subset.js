/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = [
	{
		slug: 'link-constraint-account-has-contact',
		name: 'has',
		data: {
			title: 'Contact',
			from: 'account',
			to: 'contact',
			inverse: 'link-constraint-contact-is-member-of-account'
		}
	},
	{
		slug: 'link-constraint-account-is-owned-by-user',
		name: 'is owned by',
		data: {
			title: 'Owner',
			from: 'account',
			to: 'user',
			inverse: 'link-constraint-user-owns-account'
		}
	},
	{
		slug: 'link-constraint-account-has-backup-owner',
		name: 'has backup owner',
		data: {
			title: 'Backup owner',
			from: 'account',
			to: 'user',
			inverse: 'link-constraint-user-is-backup-owner-of-account'
		}
	},
	{
		slug: 'link-constraint-account-has-attached-opportunity',
		name: 'has attached',
		data: {
			title: 'Opportunity',
			from: 'account',
			to: 'opportunity',
			inverse: 'link-constraint-opportunity-is-attached-to-account'
		}
	},
	{
		slug: 'link-constraint-issue-has-attached-support-thread',
		name: 'issue has attached support thread',
		data: {
			title: 'Support thread',
			from: 'issue',
			to: 'support-thread',
			inverse: 'link-constraint-support-thread-is-attached-to-issue'
		}
	},
	{
		slug: 'link-constraint-issue-has-attached-support-issue',
		name: 'issue has attached support issue',
		data: {
			title: 'Support issue',
			from: 'issue',
			to: 'support-issue',
			inverse: 'link-constraint-support-issue-is-attached-to-issue'
		}
	},
	{
		slug: 'link-constraint-issue-is-attached-to-brainstorm-topic',
		name: 'is attached to',
		data: {
			title: 'Brainstorm topic',
			from: 'issue',
			to: 'brainstorm-topic',
			inverse: 'link-constraint-brainstorm-topic-has-attached-issue'
		}
	},
	{
		slug: 'link-constraint-issue-comes-from-specification',
		name: 'comes from',
		data: {
			title: 'Specification',
			from: 'issue',
			to: 'specification',
			inverse: 'link-constraint-specification-is-source-for-issue'
		}
	},
	{
		slug: 'link-constraint-issue-is-attached-to-form-response',
		name: 'is attached',
		data: {
			title: 'Form Response',
			from: 'issue',
			to: 'form-response',
			inverse: 'link-constraint-form-response-has-attached-issue'
		}
	},
	{
		slug: 'link-constraint-issue-is-attached-to-user-feedback',
		name: 'is attached to',
		data: {
			title: 'User Feedback',
			from: 'issue',
			to: 'user-feedback',
			inverse: 'link-constraint-user-feedback-has-attached-issue'
		}
	}
]

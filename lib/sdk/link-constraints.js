/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// TODO Use 'LINK_CONSTRAINTS' on type cards instead of hardcoding lere
exports.constraints = [
	{
		slug: 'link-constraint-org-has-member',
		name: 'has member',
		data: {
			title: 'Member',
			from: 'org',
			to: 'user',
			inverse: 'link-constraint-user-is-member-of'
		}
	},
	{
		slug: 'link-constraint-user-is-member-of',
		name: 'is member of',
		data: {
			title: 'Org',
			from: 'user',
			to: 'org',
			inverse: 'link-constraint-org-has-member'
		}
	},
	{
		slug: 'link-constraint-user-has-attached-contact',
		name: 'has attached contact',
		data: {
			title: 'Contact',
			from: 'user',
			to: 'contact',
			inverse: 'link-constraint-contact-is-attached-to-user'
		}
	},
	{
		slug: 'link-constraint-support-thread-is-attached-to-support-issue',
		name: 'support thread is attached to support issue',
		data: {
			title: 'Support issue',
			from: 'support-thread',
			to: 'support-issue',
			inverse: 'link-constraint-support-issue-has-attached-support-thread'
		}
	},
	{
		slug: 'link-constraint-support-thread-is-attached-to-issue',
		name: 'support thread is attached to issue',
		data: {
			title: 'GitHub issue',
			from: 'support-thread',
			to: 'issue',
			inverse: 'link-constraint-issue-has-attached-support-thread'
		}
	},
	{
		slug: 'link-constraint-support-issue-has-attached-support-thread',
		name: 'support issue has attached support thread',
		data: {
			title: 'Support thread',
			from: 'support-issue',
			to: 'support-thread',
			inverse: 'link-constraint-support-thread-is-attached-to-support-issue'
		}
	},
	{
		slug: 'link-constraint-support-issue-is-attached-to-issue',
		name: 'support issue is attached to issue',
		data: {
			title: 'GitHub issue',
			from: 'support-issue',
			to: 'issue',
			inverse: 'link-constraint-issue-has-attached-support-issue'
		}
	},
	{
		slug: 'link-constraint-architecture-topic-has-attached-issue',
		name: 'architecture topic has attached issue',
		data: {
			title: 'GitHub issue',
			from: 'architecture-topic',
			to: 'issue',
			inverse: 'link-constraint-issue-is-attached-to-architecture-topic'
		}
	},
	{
		slug: 'link-constraint-issue-is-attached-to-architecture-topic',
		name: 'issue is attached to architecture topic',
		data: {
			title: 'Architecture topic',
			from: 'issue',
			to: 'architecture-topic',
			inverse: 'link-constraint-architecture-topic-has-attached-issue'
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
		slug: 'link-constraint-account-has-contact',
		name: 'has contact',
		data: {
			title: 'Contact',
			from: 'account',
			to: 'contact',
			inverse: 'link-constraint-contact-is-member-of-account'
		}
	},
	{
		slug: 'link-constraint-contact-is-member-of-account',
		name: 'is member of account',
		data: {
			title: 'Account',
			from: 'contact',
			to: 'account',
			inverse: 'link-constraint-account-has-contact'
		}
	},
	{
		slug: 'link-constraint-contact-is-attached-to-user',
		name: 'is attached to user',
		data: {
			title: 'User',
			from: 'contact',
			to: 'user',
			inverse: 'link-constraint-user-has-attached-contact'
		}
	},
	{
		slug: 'link-constraint-contact-has-primary-owner',
		name: 'has primary owner',
		data: {
			title: 'Primary owner',
			from: 'contact',
			to: 'user',
			inverse: 'link-constraint-user-is-primary-owner-of-contact'
		}
	},
	{
		slug: 'link-constraint-user-is-primary-owner-of-contact',
		name: 'is primary owner of contact',
		data: {
			title: 'Primary owner',
			from: 'user',
			to: 'contact',
			inverse: 'link-constraint-contact-has-primary-owner'
		}
	},
	{
		slug: 'link-constraint-contact-has-secondary-owner',
		name: 'has secondary owner',
		data: {
			title: 'Secondary owner',
			from: 'contact',
			to: 'user',
			inverse: 'link-constraint-user-is-secondary-owner-of-contact'
		}
	},
	{
		slug: 'link-constraint-user-is-secondary-owner-of-contact',
		name: 'is secondary owner of contact',
		data: {
			title: 'Secondary owner',
			from: 'user',
			to: 'contact',
			inverse: 'link-constraint-contact-has-secondary-owner'
		}
	},
	{
		slug: 'link-constraint-account-has-primary-owner',
		name: 'has primary owner',
		data: {
			title: 'Primary owner',
			from: 'account',
			to: 'user',
			inverse: 'link-constraint-user-is-primary-owner-of-account'
		}
	},
	{
		slug: 'link-constraint-user-is-primary-owner-of-account',
		name: 'is primary owner of account',
		data: {
			title: 'Primary owner',
			from: 'user',
			to: 'account',
			inverse: 'link-constraint-account-has-primary-owner'
		}
	},
	{
		slug: 'link-constraint-account-has-secondary-owner',
		name: 'has secondary owner',
		data: {
			title: 'Secondary owner',
			from: 'account',
			to: 'user',
			inverse: 'link-constraint-user-is-secondary-owner-of-account'
		}
	},
	{
		slug: 'link-constraint-user-is-secondary-owner-of-account',
		name: 'is secondary owner of account',
		data: {
			title: 'Secondary owner',
			from: 'user',
			to: 'account',
			inverse: 'link-constraint-account-has-secondary-owner'
		}
	}
]

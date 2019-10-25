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
	},
	{
		slug: 'link-constraint-opportunity-is-attached-to-account',
		name: 'is attached to account',
		data: {
			title: 'Account',
			from: 'opportunity',
			to: 'account',
			inverse: 'link-constraint-account-has-attached-opportunity'
		}
	},
	{
		slug: 'link-constraint-account-has-attached-opportunity',
		name: 'has attached opportunity',
		data: {
			title: 'Opportunity',
			from: 'account',
			to: 'opportunity',
			inverse: 'link-constraint-opportunity-is-attached-to-account'
		}
	},
	{
		slug: 'link-constraint-support-thread-is-source-for-feedback-item',
		name: 'is source for',
		data: {
			title: 'Feedback item',
			from: 'support-thread',
			to: 'feedback-item',
			inverse: 'link-constraint-feedback-item-is-feedback-for-support-thread'
		}
	},
	{
		slug: 'link-constraint-feedback-item-is-feedback-for-support-thread',
		name: 'is feedback for',
		data: {
			title: 'Support thread',
			from: 'feedback-item',
			to: 'support-thread',
			inverse: 'link-constraint-support-thread-is-source-for-feedback-item'
		}
	},
	{
		slug: 'link-constraint-feedback-item-is-feedback-for-user',
		name: 'is feedback for',
		data: {
			title: 'User',
			from: 'feedback-item',
			to: 'user',
			inverse: 'link-constraint-user-is-reviewed-with-feedback-item'
		}
	},
	{
		slug: 'link-constraint-user-is-reviewed-with-feedback-item',
		name: 'is reviewed with',
		data: {
			title: 'Feedback item',
			from: 'user',
			to: 'feedback-item',
			inverse: 'link-constraint-feedback-item-is-feedback-for-user'
		}
	},
	{
		slug: 'link-constraint-discussion-topic-has-attached-issue',
		name: 'architecture topic has attached issue',
		data: {
			title: 'GitHub issue',
			from: 'discussion-topic',
			to: 'issue',
			inverse: 'link-constraint-issue-is-attached-to-discussion-topic'
		}
	},
	{
		slug: 'link-constraint-issue-is-attached-to-discussion-topic',
		name: 'issue is attached to architecture topic',
		data: {
			title: 'Discussion topic',
			from: 'issue',
			to: 'discussion-topic',
			inverse: 'link-constraint-discussion-topic-has-attached-issue'
		}
	},
	{
		slug: 'link-constraint-support-thread-is-attached-to-product-improvement',
		name: 'support thread is attached to product improvement',
		data: {
			title: 'Product improvement',
			from: 'support-thread',
			to: 'product-improvement',
			inverse: 'link-constraint-product-improvement-has-attached-support-thread'
		}
	},
	{
		slug: 'link-constraint-product-improvement-has-attached-support-thread',
		name: 'product improvement has attached support thread',
		data: {
			title: 'Support thread',
			from: 'product-improvement',
			to: 'support-thread',
			inverse: 'link-constraint-support-thread-is-attached-to-product-improvement'
		}
	},
	{
		slug: 'link-constraint-discussion-topic-has-attached-product-improvement',
		name: 'discussion topic has attached product improvement',
		data: {
			title: 'Product improvement',
			from: 'discussion-topic',
			to: 'product-improvement',
			inverse: 'link-constraint-product-improvement-is-attached-to-discussion-topic'
		}
	},
	{
		slug: 'link-constraint-product-improvement-is-attached-to-discussion-topic',
		name: 'product improvement is attached to discussion topic',
		data: {
			title: 'Discussion topic',
			from: 'product-improvement',
			to: 'discussion-topic',
			inverse: 'link-constraint-discussion-topic-has-attached-product-improvement'
		}
	},
	{
		slug: 'link-constraint-discussion-topic-is-source-for-specification',
		name: 'is source for',
		data: {
			title: 'Specification',
			from: 'discussion-topic',
			to: 'specification',
			inverse: 'link-constraint-specification-comes-from-discussion-topic'
		}
	},
	{
		slug: 'link-constraint-specification-comes-from-discussion-topic',
		name: 'comes from',
		data: {
			title: 'Discussion topic',
			from: 'specification',
			to: 'discussion-topic',
			inverse: 'link-constraint-discussion-topic-is-source-for-specification'
		}
	},
	{
		slug: 'link-constraint-specification-is-source-for-issue',
		name: 'is source for',
		data: {
			title: 'Issue',
			from: 'specification',
			to: 'issue',
			inverse: 'link-constraint-issue-comes-from-specification'
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
		slug: 'link-constraint-agenda-has-discussion-topic',
		name: 'has',
		data: {
			title: 'Discussion topic',
			from: 'agenda',
			to: 'discussion-topic',
			inverse: 'link-constraint-discussion-topic-appears-in-agenda'
		}
	},
	{
		slug: 'link-constraint-discussion-topic-appears-in-agenda',
		name: 'appears in',
		data: {
			title: 'Agenda',
			from: 'discussion-topic',
			to: 'agenda',
			inverse: 'link-constraint-agenda-has-discussion-topic'
		}
	}
]

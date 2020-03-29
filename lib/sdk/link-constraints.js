/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const _ = require('lodash')

exports.supportsLink = _.memoize((cardType, linkName) => {
	return Boolean(_.find(
		exports.constraints,
		// eslint-disable-next-line lodash/matches-shorthand
		(link) => { return link.name === linkName && link.data.from === cardType.split('@')[0] }
	))
}, (cardType, linkName) => {
	// Create a unique cache key from the link name and card type
	return `${cardType}-${linkName}`
})

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
		slug: 'link-constraint-support-thread-is-owned-by',
		name: 'is owned by',
		data: {
			title: 'Owner',
			from: 'support-thread',
			to: 'user',
			inverse: 'link-constraint-user-is-owner-of-support-thread'
		}
	},
	{
		slug: 'link-constraint-user-is-owner-of-support-thread',
		name: 'is owner of',
		data: {
			title: 'Support thread',
			from: 'user',
			to: 'support-thread',
			inverse: 'link-constraint-support-thread-is-owned-by'
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
		name: 'has',
		data: {
			title: 'Contact',
			from: 'account',
			to: 'contact',
			inverse: 'link-constraint-contact-is-member-of-account'
		}
	},
	{
		slug: 'link-constraint-contact-is-member-of-account',
		name: 'is member of',
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
		slug: 'link-constraint-contact-is-owned-by-user',
		name: 'is owned by',
		data: {
			title: 'Owner',
			from: 'contact',
			to: 'user',
			inverse: 'link-constraint-user-owns-contact'
		}
	},
	{
		slug: 'link-constraint-user-owns-contact',
		name: 'owns',
		data: {
			title: 'Owner',
			from: 'user',
			to: 'contact',
			inverse: 'link-constraint-contact-is-owned-by-user'
		}
	},
	{
		slug: 'link-constraint-contact-has-backup-owner',
		name: 'has backup owner',
		data: {
			title: 'Backup owner',
			from: 'contact',
			to: 'user',
			inverse: 'link-constraint-user-is-backup-owner-of-contact'
		}
	},
	{
		slug: 'link-constraint-user-is-backup-owner-of-contact',
		name: 'is backup owner of',
		data: {
			title: 'Backup owner',
			from: 'user',
			to: 'contact',
			inverse: 'link-constraint-contact-has-backup-owner'
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
		slug: 'link-constraint-user-owns-account',
		name: 'owns',
		data: {
			title: 'Owner',
			from: 'user',
			to: 'account',
			inverse: 'link-constraint-account-is-owned-by-user'
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
		slug: 'link-constraint-user-is-backup-owner-of-account',
		name: 'is backup owner of',
		data: {
			title: 'Backup owner',
			from: 'user',
			to: 'account',
			inverse: 'link-constraint-account-has-backup-owner'
		}
	},
	{
		slug: 'link-constraint-opportunity-is-attached-to-account',
		name: 'is attached to',
		data: {
			title: 'Account',
			from: 'opportunity',
			to: 'account',
			inverse: 'link-constraint-account-has-attached-opportunity'
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
		slug: 'link-constraint-opportunity-is-owned-by-user',
		name: 'is owned by',
		data: {
			title: 'Owner',
			from: 'opportunity',
			to: 'user',
			inverse: 'link-constraint-user-owns-opportunity'
		}
	},
	{
		slug: 'link-constraint-sales-thread-is-attached-to-opportunity',
		name: 'is attached to',
		data: {
			title: 'Opportunity',
			from: 'sales-thread',
			to: 'opportunity',
			inverse: 'link-constraint-opportunity-has-attached-sales-thread'
		}
	},
	{
		slug: 'link-constraint-opportunity-has-attached-sales-thread',
		name: 'has attached',
		data: {
			title: 'Sales thread',
			from: 'opportunity',
			to: 'sales-thread',
			inverse: 'link-constraint-sales-thread-is-attached-to-opportunity'
		}
	},
	{
		slug: 'link-constraint-user-owns-opportunity',
		name: 'owns',
		data: {
			title: 'Owner',
			from: 'user',
			to: 'opportunity',
			inverse: 'link-constraint-opportunity-is-owned-by-user'
		}
	},
	{
		slug: 'link-constraint-opportunity-has-backup-owner',
		name: 'has backup owner',
		data: {
			title: 'Backup owner',
			from: 'opportunity',
			to: 'user',
			inverse: 'link-constraint-user-is-backup-owner-of-opportunity'
		}
	},
	{
		slug: 'link-constraint-user-is-backup-owner-of-opportunity',
		name: 'is backup owner of',
		data: {
			title: 'Backup owner',
			from: 'user',
			to: 'opportunity',
			inverse: 'link-constraint-opportunity-has-backup-owner'
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
		name: 'has attached',
		data: {
			title: 'GitHub issue',
			from: 'discussion-topic',
			to: 'issue',
			inverse: 'link-constraint-issue-is-attached-to-discussion-topic'
		}
	},
	{
		slug: 'link-constraint-issue-is-attached-to-discussion-topic',
		name: 'is attached to',
		data: {
			title: 'Discussion topic',
			from: 'issue',
			to: 'discussion-topic',
			inverse: 'link-constraint-discussion-topic-has-attached-issue'
		}
	},
	{
		slug: 'link-constraint-support-thread-is-attached-to-product-improvement',
		name: 'is attached to',
		data: {
			title: 'Product improvement',
			from: 'support-thread',
			to: 'product-improvement',
			inverse: 'link-constraint-product-improvement-has-attached-support-thread'
		}
	},
	{
		slug: 'link-constraint-product-improvement-has-attached-support-thread',
		name: 'has attached',
		data: {
			title: 'Support thread',
			from: 'product-improvement',
			to: 'support-thread',
			inverse: 'link-constraint-support-thread-is-attached-to-product-improvement'
		}
	},
	{
		slug: 'link-constraint-discussion-topic-has-attached-product-improvement',
		name: 'has attached',
		data: {
			title: 'Product improvement',
			from: 'discussion-topic',
			to: 'product-improvement',
			inverse: 'link-constraint-product-improvement-is-attached-to-discussion-topic'
		}
	},
	{
		slug: 'link-constraint-product-improvement-is-attached-to-discussion-topic',
		name: 'is attached to',
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
	},
	{
		slug: 'link-constraint-project-is-owned-by-user',
		name: 'is owned by',
		data: {
			title: 'Owner',
			from: 'project',
			to: 'user',
			inverse: 'link-constraint-user-owns-project'
		}
	},
	{
		slug: 'link-constraint-user-owns-project',
		name: 'owns',
		data: {
			title: 'Project',
			from: 'user',
			to: 'project',
			inverse: 'link-constraint-project-is-owned-by-user'
		}
	},
	{
		slug: 'link-constraint-project-is-guided-by-user',
		name: 'is guided by',
		data: {
			title: 'Guide',
			from: 'project',
			to: 'user',
			inverse: 'link-constraint-user-guides-project'
		}
	},
	{
		slug: 'link-constraint-user-guides-project',
		name: 'guides',
		data: {
			title: 'Project',
			from: 'user',
			to: 'project',
			inverse: 'link-constraint-project-is-guided-by-user'
		}
	},
	{
		slug: 'link-constraint-project-has-member',
		name: 'has member',
		data: {
			title: 'Member',
			from: 'project',
			to: 'user',
			inverse: 'link-constraint-user-is-member-of-project'
		}
	},
	{
		slug: 'link-constraint-user-is-member-of-project',
		name: 'is member of',
		data: {
			title: 'Project',
			from: 'user',
			to: 'project',
			inverse: 'link-constraint-project-has-member'
		}
	},
	{
		slug: 'link-constraint-project-is-contributed-to-by-user',
		name: 'is contributed to by',
		data: {
			title: 'Contributors',
			from: 'project',
			to: 'user',
			inverse: 'link-constraint-user-contributes-to-project'
		}
	},
	{
		slug: 'link-constraint-user-contributes-to-project',
		name: 'contributes to',
		data: {
			title: 'Project contributions',
			from: 'user',
			to: 'project',
			inverse: 'link-constraint-project-is-contributed-to-by-user'
		}
	},
	{
		slug: 'link-constraint-project-is-observed-by-user',
		name: 'is observed by',
		data: {
			title: 'Observers',
			from: 'project',
			to: 'user',
			inverse: 'link-constraint-user-observes-project'
		}
	},
	{
		slug: 'link-constraint-user-observes-project',
		name: 'observes',
		data: {
			title: 'Project observations',
			from: 'user',
			to: 'project',
			inverse: 'link-constraint-project-is-observed-by-user'
		}
	},
	{
		slug: 'link-constraint-checkin-is-attended-by-user',
		name: 'is attended by',
		data: {
			title: 'Attendee',
			from: 'checkin',
			to: 'user',
			inverse: 'link-constraint-user-attended-checkin'
		}
	},
	{
		slug: 'link-constraint-user-attended-checkin',
		name: 'attended',
		data: {
			title: 'Checkin',
			from: 'user',
			to: 'checkin',
			inverse: 'link-constraint-checkin-is-attended-by-user'
		}
	},
	{
		slug: 'link-constraint-project-has-checkin',
		name: 'has',
		data: {
			title: 'Checkins',
			from: 'project',
			to: 'checkin',
			inverse: 'link-constraint-checkin-is-of-project'
		}
	},
	{
		slug: 'link-constraint-checkin-is-of-project',
		name: 'is of',
		data: {
			title: 'Project',
			from: 'checkin',
			to: 'project',
			inverse: 'link-constraint-project-has-checkin'
		}
	}
]

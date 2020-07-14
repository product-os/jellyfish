/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// FIXME: This should be moved to the correct `is-attached-to/has-attached` relationship.

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-support-thread-is-attached-to-support-issue-support-issue-has-attached-support-thread',
		type: 'type@1.0.0',
		name: 'Relationship: support thread is attached to support issue/support issue has attached support thread',
		data: {
			is_link: true,
			forward: 'support thread is attached to issue',
			reverse: 'issue has attached support thread',
			type_pairs: [
				[ 'support-thread', 'support-issue' ]
			]
		}
	}))
}

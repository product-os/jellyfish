/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// FIXME: Can this be moved to `is-feedback-for/is-reviewed-with`?

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-source-for-is-feedback-for',
		type: 'type@1.0.0',
		name: 'Relationship: is source for/is feedback for',
		data: {
			is_link: true,
			forward: 'is source for',
			reverse: 'is feedback for',
			type_pairs: [
				[ 'support-thread', 'feedback-item' ]
			]
		}
	}))
}

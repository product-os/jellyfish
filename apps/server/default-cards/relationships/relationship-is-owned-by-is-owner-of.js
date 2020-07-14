/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// FIXME: This should be moved to the correct `is-owned-by/owns` relationship.

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-owned-by-is-owner-of',
		type: 'type@1.0.0',
		name: 'Relationship: is owned by/is owner of',
		data: {
			is_link: true,
			forward: 'is owned by',
			reverse: 'is owner of',
			type_pairs: [
				[ 'support-thread', 'user' ]
			]
		}
	}))
}

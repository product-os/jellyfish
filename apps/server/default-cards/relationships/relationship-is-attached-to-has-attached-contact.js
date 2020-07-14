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
		slug: 'relationship-is-attached-to-has-attached-contact',
		type: 'type@1.0.0',
		name: 'Relationship: is attached to/has attached contact',
		data: {
			is_link: true,
			forward: 'is attached to',
			reverse: 'has attached contact',
			type_pairs: [
				[ 'contact', 'user' ]
			]
		}
	}))
}

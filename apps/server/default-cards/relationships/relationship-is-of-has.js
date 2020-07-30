/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-of-has',
		type: 'type@1.0.0',
		name: 'Relationship: is of/has',
		data: {
			is_relationship: true,
			forward: 'is of',
			reverse: 'has',
			type_pairs: [
				[ 'checkin', 'project' ],
				[ 'thread', 'repository' ]
			]
		}
	}))
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-appears-in-has',
		type: 'type@1.0.0',
		name: 'Relationship: appears in/has',
		data: {
			is_relationship: true,
			forward: 'appears in',
			reverse: 'has',
			type_pairs: [
				[ 'discussion-topic', 'agenda' ]
			]
		}
	}))
}

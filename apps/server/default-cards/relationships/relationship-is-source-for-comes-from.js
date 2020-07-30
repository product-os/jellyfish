/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-source-for-comes-from',
		type: 'type@1.0.0',
		name: 'Relationship: is source for/comes from',
		data: {
			is_relationship: true,
			forward: 'is source for',
			reverse: 'comes from',
			type_pairs: [
				[ 'discussion-topic', 'specification' ],
				[ 'specification', 'issue' ]
			]
		}
	}))
}

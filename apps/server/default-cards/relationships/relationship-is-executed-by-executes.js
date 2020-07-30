/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-executed-by-executes',
		type: 'type@1.0.0',
		name: 'Relationship: is executed by/executes',
		data: {
			is_relationship: true,
			forward: 'is executed by',
			reverse: 'executes',
			type_pairs: [
				[ 'action-request', 'execute' ]
			]
		}
	}))
}

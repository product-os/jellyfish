/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-contributed-to-by-contributes-to',
		type: 'type@1.0.0',
		name: 'Relationship: is contributed to by/contributes-to',
		data: {
			is_relationship: true,
			forward: 'is contributed to by',
			reverse: 'contributes to',
			type_pairs: [
				[
					{
						name: 'project',
						title: 'Project contribution'
					}, {
						name: 'user',
						title: 'Contributor'
					}
				]
			]
		}
	}))
}

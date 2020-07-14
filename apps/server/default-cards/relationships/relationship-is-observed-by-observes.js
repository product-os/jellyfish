/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-observed-by-observes',
		type: 'type@1.0.0',
		name: 'Relationship: is observed by/observes',
		data: {
			is_link: true,
			forward: 'is observed by',
			reverse: 'observes',
			type_pairs: [
				[
					{
						name: 'project',
						title: 'Project observation'
					},
					{
						name: 'user',
						title: 'Observer'
					}
				]
			]
		}
	}))
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-guided-by-guides',
		type: 'type@1.0.0',
		name: 'Relationship: is guided by/guides',
		data: {
			is_link: true,
			forward: 'is guided by',
			reverse: 'guides',
			type_pairs: [
				[
					'project',
					{
						name: 'user', title: 'Guide'
					}
				]
			]
		}
	}))
}

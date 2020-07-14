/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	const userAsMember = {
		name: 'user', title: 'Member'
	}

	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-member-of-has',
		type: 'type@1.0.0',
		name: 'Relationship: is member of/has',
		data: {
			is_link: true,
			forward: 'is member of',
			reverse: 'has',
			type_pairs: [
				[ 'contact', 'account' ],
				[ userAsMember, 'org' ],
				[ userAsMember, 'project' ]
			]
		}
	}))
}

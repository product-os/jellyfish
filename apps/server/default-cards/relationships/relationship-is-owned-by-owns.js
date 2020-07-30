/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	// FIXME: Does the prevalence of this alias indicate that we have a missing
	// type in our model?
	const userAsOwner = {
		name: 'user', title: 'Owner'
	}

	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-owned-by-owns',
		type: 'type@1.0.0',
		name: 'Relationship: is owned by/owns',
		data: {
			is_relationship: true,
			forward: 'is owned by',
			reverse: 'owns',
			type_pairs: [
				[ 'account', userAsOwner ],
				[ 'contact', userAsOwner ],
				[ 'opportunity', userAsOwner ],
				[ 'project', userAsOwner ],
				[ 'sales-thread', userAsOwner ]
			]
		}
	}))
}

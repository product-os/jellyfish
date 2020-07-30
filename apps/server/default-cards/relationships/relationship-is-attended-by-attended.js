/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-attended-by-attended',
		type: 'type@1.0.0',
		name: 'Relationship: is attended by/attended',
		data: {
			is_relationship: true,
			forward: 'is attended by',
			reverse: 'attended',
			type_pairs: [
				[
					'checkin',
					{
						name: 'user', title: 'Attendee'
					}
				]
			]
		}
	}))
}

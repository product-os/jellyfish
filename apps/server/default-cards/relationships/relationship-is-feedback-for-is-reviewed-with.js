/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-feedback-for-is-reviewed-with',
		type: 'type@1.0.0',
		name: 'Relationship: is feedback for/is reviewed with',
		data: {
			is_link: true,
			forward: 'is feedback for',
			reverse: 'is reviewed with',
			type_pairs: [
				[ 'feedback-item', 'user' ]
			]
		}
	}))
}

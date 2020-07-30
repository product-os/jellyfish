/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({

		slug: 'relationship-issubscribed-for-is-subscribed-with',
		type: 'type@1.0.0',
		name: 'Relationship: is subscribed for/is subscribed with',
		data: {
			is_relationship: true,
			forward: 'is subscribed for',
			reverse: 'is subscribed with',
			type_pairs: [
				[
					'web-push-subscription',
					{
						name: 'user',
						title: 'Web push subscription user'
					}
				]
			]
		}
	}))
}

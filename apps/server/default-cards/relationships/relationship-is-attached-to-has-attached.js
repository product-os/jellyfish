/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	generateRelationshipSchema, sensibleDefaults
}) => {
	return generateRelationshipSchema(sensibleDefaults({
		slug: 'relationship-is-attached-to-has-attached',
		type: 'type@1.0.0',
		name: 'Relationship: is attached to/has attached',
		data: {
			is_link: true,
			forward: 'is attached to',
			reverse: 'has attached',
			type_pairs: [
				[
					'discussion-topic',
					{
						name: 'issue',
						title: 'GitHub issue'
					}
				],
				[ 'opportunity', 'account' ],
				[ 'product-improvement', 'discussion-topic' ],
				[ 'sales-thread', 'opportunity' ],
				[ 'support-thread', 'product-improvement' ],
				[ 'support-thread', 'support-issue' ]
			]
		}
	}))
}

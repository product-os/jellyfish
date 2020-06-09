/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const getGroups = async (sdk, value) => {
	// TODO: limit this by organisation
	const matchingGroups = await sdk.query({
		type: 'object',
		properties: {
			type: {
				const: 'group@1.0.0'
			},
			name: {
				pattern: `^${value}`
			}
		},
		required: [ 'type', 'name' ],
		additionalProperties: true
	}, {
		limit: 10,
		sortBy: 'slug'
	})

	return matchingGroups
}

export default getGroups

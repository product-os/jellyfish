/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// A handy helper which can generate the somewhat lengthy schema for a link type.

const extractTypeNames = (types) => {
	return types.map((type) => {
		if (typeof (type) === 'string') {
			return type
		}
		return type.name
	})
}

const branchSchema = (fromType, name, toType, inverseName) => {
	return {
		properties: {
			name: {
				const: name
			},
			data: {
				type: 'object',
				properties: {
					from: {
						type: 'object',
						properties: {
							type: {
								const: fromType
							}
						},
						required: [ 'type' ]
					},
					to: {
						type: 'object',
						properties: {
							type: {
								const: toType
							}
						},
						required: [ 'type' ]
					},
					inverseName: {
						const: inverseName
					}
				},
				required: [ 'from', 'to', 'inverseName' ]
			}
		}
	}
}

const schemaForLinkType = (linkType) => {
	const {
		forward, reverse
	} = linkType.data
	const types = extractTypeNames(linkType.data.types)
	const branches = [
		branchSchema(types[0], forward, types[1], reverse),
		branchSchema(types[1], reverse, types[0], forward)
	]

	return {
		type: 'object',
		oneOf: branches,
		required: [ 'name', 'data' ]
	}
}

module.exports = schemaForLinkType

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable camelcase */

const skhema = require('skhema')
const _ = require('lodash')

// Generates the schema that matches a single branch out of the `oneOf` that is
// the valid matches for this relationship type.
const branchSchema = (sourceType, targetType, forwardName, reverseName) => {
	return {
		properties: {
			name: {
				const: forwardName
			},
			data: {
				type: 'object',
				properties: {
					from: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								pattern: `^${sourceType}@`
							},
							id: {
								type: 'string',
								format: 'uuid'
							}

						},
						required: [ 'type', 'id' ]
					},
					to: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								pattern: `^${targetType}@`
							},
							id: {
								type: 'string',
								format: 'uuid'
							}
						},
						required: [ 'type', 'id' ]
					},
					inverseName: {
						const: reverseName
					}
				},
				required: [ 'from', 'to', 'inverseName' ]
			}
		}
	}
}

// Some types are just a string value with a name that can be used for
// inflection, some are objects that have a name and a title.
const extractTypeName = (type) => {
	if (_.isString(type)) {
		return type
	}

	return type.name
}

// Generates a schema to match instances of a relationship type card.
//
// If the card already has a JSON schema then the generated schema is merged
// with the existing one.
module.exports = function (sourceCard) {
	const {
		type_pairs, forward, reverse
	} = sourceCard.data

	const sourceSchema = sourceCard.data.schema || {
		type: 'object'
	}

	const branches = (type_pairs || []).reduce((acc, [ sourceType, targetType ]) => {
		const sourceTypeName = extractTypeName(sourceType)
		const targetTypeName = extractTypeName(targetType)
		acc.push(branchSchema(sourceTypeName, targetTypeName, forward, reverse))
		acc.push(branchSchema(targetTypeName, sourceTypeName, reverse, forward))
		return acc
	}, [])

	const newSchema = skhema.merge([ sourceSchema, {
		type: 'object',
		oneOf: branches,
		required: [ 'name', 'data' ]
	} ])

	const newCard = _.cloneDeep(sourceCard)
	newCard.data.schema = newSchema
	return newCard
}

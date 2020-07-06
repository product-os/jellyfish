/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'

const mergeWithUniqConcatArrays = (objValue, srcValue) => {
	if (_.isArray(objValue)) {
		return _.uniq(objValue.concat(srcValue))
	}
	// eslint-disable-next-line no-undefined
	return undefined
}

export const withSearch = (query, searchTerm) => {
	if (searchTerm) {
		return _.mergeWith(query, {
			properties: {
				data: {
					properties: {
						payload: {
							properties: {
								message: {
									type: 'string',
									fullTextSearch: {
										term: searchTerm
									}
								}
							},
							required: [ 'message' ]
						}
					}
				}
			}
		}, mergeWithUniqConcatArrays)
	}
	return query
}

// Generates a basic query that matches messages against a user slug or group names
export const getPingQuery = (user, groupNames, searchTerm) => {
	const mentionsUserSchema = {
		properties: {
			mentionsUser: {
				type: 'array',
				contains: {
					const: user.slug
				}
			}
		},
		required: [
			'mentionsUser'
		]
	}
	const query = {
		type: 'object',
		required: [ 'data', 'type' ],
		properties: {
			type: {
				type: 'string',
				enum: [
					'message@1.0.0',
					'whisper@1.0.0'
				]
			},
			data: {
				type: 'object',
				required: [ 'payload' ],
				properties: {
					// If there are no groupNames, don't create a schema fragment looking for groups,
					// as that would create an `enum` with no values, which is invalid
					payload: groupNames.length ? {
						type: 'object',
						anyOf: [
							mentionsUserSchema,
							{
								properties: {
									mentionsGroup: {
										type: 'array',
										contains: {
											enum: groupNames
										}
									}
								},
								required: [
									'mentionsGroup'
								]
							}
						],
						additionalProperties: true
					} : {
						...mentionsUserSchema,
						type: 'object',
						additionalProperties: true
					}
				},
				additionalProperties: true
			}
		},
		additionalProperties: true
	}

	return withSearch(query, searchTerm)
}

export const getUnreadQuery = (user, groupNames, searchTerm) => {
	return _.merge(getPingQuery(user, groupNames, searchTerm), {
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					readBy: {
						type: 'array',
						not: {
							contains: {
								const: user.slug
							}
						}
					}
				}
			}
		}
	})
}

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

const oneToOneProperties = (userSlug) => ({
	required: [ 'markers' ],
	properties: {
		markers: {
			type: 'array',
			contains: {
				pattern: userSlug
			}
		}
	}
})

const payloadProperties = (propertyName, isEnum, searchTerm) => ({
	required: [ 'data' ],
	properties: {
		data: {
			type: 'object',
			required: [ 'payload' ],
			properties: {
				payload: {
					type: 'object',
					required: [ propertyName ],
					properties: {
						[propertyName]: {
							type: 'array',
							contains: {
								[isEnum ? 'enum' : 'const']: searchTerm
							}
						}
					}
				}
			}
		}
	}
})

// Generates a basic query that matches messages against a user slug or group names
export const getPingQuery = (user, groupNames, searchTerm) => {
	const anyOf = [
		oneToOneProperties(user.slug),
		payloadProperties('mentionsUser', false, user.slug),
		payloadProperties('alertsUser', false, user.slug)
	]
	if (groupNames && groupNames.length) {
		anyOf.push(
			payloadProperties('mentionsGroup', true, groupNames),
			payloadProperties('alertsGroup', true, groupNames)
		)
	}
	const query = {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [ 'message@1.0.0', 'whisper@1.0.0', 'summary@1.0.0' ]
			},
			data: {
				type: 'object',
				required: [ 'actor' ],
				properties: {
					actor: {
						not: {
							const: user.id
						}
					}
				}
			}
		},
		anyOf,
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

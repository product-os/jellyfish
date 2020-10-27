/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'

export const mergeWithUniqConcatArrays = (objValue, srcValue) => {
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
				// Find markers that contain the userSlug + another user's slug
				pattern: `(user-.*\\+${userSlug}|${userSlug}\\+user-.*)`
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

export const getChannelQuery = (cardId) => {
	const cardQuery = getCardQuery(cardId)
	const cardWithLinksQuery = getCardWithLinksQuery(cardId)
	const linksQuery = getLinksQuery(cardId)
	return {
		type: 'object',
		anyOf: [ cardQuery, cardWithLinksQuery, linksQuery ]
	}
}

export const getCardQuery = (cardId) => ({
	properties: {
		id: {
			const: cardId
		}
	}
})

export const getCardWithLinksQuery = (cardId) => ({
	properties: {
		id: {
			const: cardId
		}
	},
	$$links: {
		'has attached element': {
			type: 'object'
		}
	}
})

export const getLinksQuery = (cardId) => {
	const toLinkSchema = {
		properties: {
			to: {
				type: 'object',
				properties: {
					id: {
						const: cardId
					},
					type: {
						type: 'string'
					},
					slug: {
						type: 'string'
					}
				}
			}
		}
	}

	const fromLinkSchema = {
		properties: {
			from: {
				type: 'object',
				properties: {
					id: {
						const: cardId
					},
					type: {
						type: 'string'
					},
					slug: {
						type: 'string'
					}
				}
			}
		}
	}

	return {
		required: [ 'type', 'data' ],
		properties: {
			type: {
				const: 'link@1.0.0'
			},
			name: {
				not: {
					enum: [ 'has attached element', 'is attached to' ]
				}
			},
			data: {
				type: 'object',
				anyOf: [ toLinkSchema, fromLinkSchema ]
			}
		}
	}
}

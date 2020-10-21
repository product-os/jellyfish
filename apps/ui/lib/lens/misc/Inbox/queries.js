/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	queries
} from '../../../core'

export const getUnreadQuery = queries.getUnreadQuery

export const getReadQuery = (user, groupNames, searchTerm) => {
	return _.merge(queries.getPingQuery(user, groupNames, searchTerm), {
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					readBy: {
						type: 'array',
						contains: {
							const: user.slug
						},
						minLength: 1
					}
				},
				required: [
					'readBy',
					'payload'
				]
			}
		}
	})
}

export const getSentQuery = (user, groupNames, searchTerm) => {
	return queries.withSearch({
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [
					'message@1.0.0',
					'whisper@1.0.0',
					'summary@1.0.0'
				]
			},
			data: {
				type: 'object',
				properties: {
					actor: {
						type: 'string',
						const: user.id
					}
				},
				additionalProperties: true
			}
		},
		additionalProperties: true
	}, searchTerm)
}

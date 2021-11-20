import _ from 'lodash';
import { queries } from '../../../core';
import { mergeWithUniqConcatArrays } from '../../../core/queries';

export const getUnreadQuery = queries.getUnreadQuery;

export const getReadQuery = (user, groupNames, searchTerm) => {
	return _.mergeWith(
		queries.getPingQuery(user, groupNames, searchTerm),
		{
			type: 'object',
			required: ['data'],
			properties: {
				data: {
					type: 'object',
					properties: {
						readBy: {
							type: 'array',
							contains: {
								const: user.slug,
							},
							minLength: 1,
						},
					},
					required: ['readBy'],
				},
			},
		},
		mergeWithUniqConcatArrays,
	);
};

export const getSentQuery = (user, groupNames, searchTerm) => {
	return queries.withSearch(
		{
			type: 'object',
			required: ['type', 'data'],
			properties: {
				type: {
					type: 'string',
					anyOf: [
						{
							const: 'message@1.0.0',
						},
						{
							const: 'whisper@1.0.0',
						},
						{
							const: 'summary@1.0.0',
						},
						{
							const: 'rating@1.0.0',
						},
					],
				},
				data: {
					type: 'object',
					required: ['actor'],
					properties: {
						actor: {
							type: 'string',
							const: user.id,
						},
					},
					additionalProperties: true,
				},
			},
			additionalProperties: true,
		},
		searchTerm,
	);
};

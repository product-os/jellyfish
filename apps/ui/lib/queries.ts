import { isArray, mergeWith, uniq } from 'lodash';

export const mergeWithUniqConcatArrays = (objValue, srcValue) => {
	if (isArray(objValue)) {
		return uniq(objValue.concat(srcValue));
	}
	// eslint-disable-next-line no-undefined
	return undefined;
};

export const withSearch = (query, searchTerm) => {
	if (searchTerm) {
		return mergeWith(
			query,
			{
				required: ['data'],
				properties: {
					data: {
						required: ['payload'],
						properties: {
							payload: {
								type: 'object',
								properties: {
									message: {
										type: 'string',
										fullTextSearch: {
											term: searchTerm,
										},
									},
								},
								required: ['message'],
							},
						},
					},
				},
			},
			mergeWithUniqConcatArrays,
		);
	}
	return query;
};

const oneToOneProperties = (userSlug) => ({
	required: ['markers'],
	properties: {
		markers: {
			type: 'array',
			contains: {
				// Find markers that contain the userSlug + another user's slug
				pattern: `(user-.*\\+${userSlug}|${userSlug}\\+user-.*)`,
			},
		},
	},
});

const payloadProperties = (propertyName, isEnum, searchTerm) => ({
	required: ['data'],
	properties: {
		data: {
			type: 'object',
			required: ['payload'],
			properties: {
				payload: {
					type: 'object',
					required: [propertyName],
					properties: {
						[propertyName]: {
							type: 'array',
							contains: {
								[isEnum ? 'enum' : 'const']: searchTerm,
							},
						},
					},
				},
			},
		},
	},
});

// Generates a basic query that matches messages against a user slug or group names
export const getPingQuery = (user, groupNames, searchTerm) => {
	const anyOf = [
		oneToOneProperties(user.slug),
		payloadProperties('mentionsUser', false, user.slug),
		payloadProperties('alertsUser', false, user.slug),
	];
	if (groupNames && groupNames.length) {
		anyOf.push(
			payloadProperties('mentionsGroup', true, groupNames),
			payloadProperties('alertsGroup', true, groupNames),
		);
	}
	const query = {
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
						not: {
							const: user.id,
						},
					},
				},
			},
		},
		anyOf,
		additionalProperties: true,
	};

	return withSearch(query, searchTerm);
};

export const getUnreadQuery = (user, groupNames, searchTerm?) => {
	return mergeWith(
		getPingQuery(user, groupNames, searchTerm),
		{
			type: 'object',
			required: ['data'],
			properties: {
				data: {
					type: 'object',
					properties: {
						readBy: {
							type: 'array',
							not: {
								contains: {
									const: user.slug,
								},
							},
						},
					},
				},
			},
		},
		mergeWithUniqConcatArrays,
	);
};

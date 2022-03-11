import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';

const getGroups = async (sdk: JellyfishSDK, value: string) => {
	// TODO: limit this by organisation
	const matchingGroups = await sdk.query(
		{
			type: 'object',
			properties: {
				type: {
					const: 'group@1.0.0',
				},
				name: {
					pattern: `^${value}`,
				},
			},
			required: ['type', 'name'],
			additionalProperties: true,
		},
		{
			limit: 10,
			sortBy: 'slug',
		},
	);

	return matchingGroups;
};

export default getGroups;

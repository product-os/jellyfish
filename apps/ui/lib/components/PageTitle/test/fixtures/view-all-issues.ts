import { ChannelContract } from '../../../../types';

const channel: ChannelContract = {
	id: 'd3cb93a8-2c88-4ea1-a045-f4cd72466e81',
	created_at: '2020-10-19T06:03:23.759Z',
	slug: 'channel-d3cb93a8-2c88-4ea1-a045-f4cd72466e81',
	type: 'channel',
	active: true,
	version: '1.0.0',
	tags: [],
	markers: [],
	requires: [],
	capabilities: [],
	data: {
		target: 'view-all-issues',
		canonical: true,
		head: {
			contract: {
				id: '421390e8-a9aa-4855-9c8d-080c6c26f812',
				data: {
					allOf: [
						{
							name: 'Active cards',
							schema: {
								type: 'object',
								$$links: {
									'has attached element': {
										type: 'object',
										properties: {
											type: {
												enum: [
													'message@1.0.0',
													'update@1.0.0',
													'create@1.0.0',
													'whisper@1.0.0',
												],
											},
										},
										additionalProperties: true,
									},
								},
								required: ['active', 'type'],
								properties: {
									type: {
										type: 'string',
										const: 'issue@1.0.0',
									},
									active: {
										type: 'boolean',
										const: true,
									},
								},
								additionalProperties: true,
							},
						},
					],
				},
				name: 'All GitHub issues',
				slug: 'view-all-issues',
				tags: [],
				type: 'view@1.0.0',
				links: {},
				active: true,
				markers: ['org-balena'],
				version: '1.0.0',
				requires: [],
				linked_at: {},
				created_at: '2020-10-06T01:14:50.299Z',
				updated_at: null,
				capabilities: [],
			},
		},
	},
};

export default channel;

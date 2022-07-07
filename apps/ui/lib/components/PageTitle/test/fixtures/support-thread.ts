import { ChannelContract } from '../../../../types';

const channel: ChannelContract = {
	id: '8f3edd33-56b6-4190-ada0-d63c87a5032e',
	created_at: '2020-10-19T06:08:12.155Z',
	slug: 'channel-8f3edd33-56b6-4190-ada0-d63c87a5032e',
	type: 'channel',
	active: true,
	version: '1.0.0',
	tags: [],
	markers: [],
	requires: [],
	capabilities: [],
	data: {
		target: '72e4d98c-e6af-4024-8a98-b4d82eb927dc',
		canonical: true,
		head: {
			contract: {
				id: '72e4d98c-e6af-4024-8a98-b4d82eb927dc',
				data: {
					inbox: 'S/Paid_Support',
					status: 'open',
					category: 'general',
					participants: [
						'ee97f2f4-2480-4644-b175-28297bbafb74',
						'ee97f2f4-2480-4644-b175-28297bbafb74',
					],
				},
				name: null,
				slug: 'support-thread-b98847cc-a804-4ea3-b861-f1f4d699506f',
				tags: [],
				type: 'support-thread@1.0.0',
				active: true,
				markers: [],
				version: '1.0.0',
				requires: [],
				linked_at: {
					'has attached element': '2020-10-19T04:15:10.373Z',
				},
				created_at: '2020-10-19T04:15:09.900Z',
				updated_at: '2020-10-19T04:15:10.171Z',
				capabilities: [],
			},
		},
	},
};

export default channel;

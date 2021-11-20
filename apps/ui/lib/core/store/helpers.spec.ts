import { v4 as uuid } from 'uuid';
import type { Contract } from '@balena/jellyfish-types/build/core';
import update from 'immutability-helper';
import { mentionsUser, updateThreadChannels } from './helpers';

const getMessageCard = (target: string): Partial<Contract> => {
	return {
		id: uuid(),
		data: {
			target,
		},
	};
};

const getThreadChannel = (id: string, messages: Array<Partial<Contract>>) => {
	return {
		data: {
			head: {
				id,
				links: {
					'has attached element': messages,
				},
			},
		},
	};
};

describe('Redux store helpers', () => {
	describe('updateThreadChannels', () => {
		test(' updates the corresponding channel', () => {
			// Setup:
			const messageT1a = getMessageCard('t1');
			const messageT1b = getMessageCard('t1');
			const messageT2a = getMessageCard('t2');
			const channel1 = getThreadChannel('t1', [messageT1a, messageT1b]);
			const channel2 = getThreadChannel('t2', [messageT2a]);
			const allChannels = [channel1, channel2];
			const updatedMessageT1b = update(messageT1b, {
				data: {
					mirrors: {
						$set: ['www.google.com'],
					},
				},
			});

			// Action:
			// - Update the second event in the first channel
			const updatedChannels = updateThreadChannels(
				't1',
				updatedMessageT1b,
				allChannels,
			);

			// Verify
			// - Only channel 't1' is updated
			expect(updatedChannels.length).toBe(1);
			expect(updatedChannels[0].data.head.id).toBe('t1');

			// - the second event in the updated channel now has the mirrors field set
			const mirrors =
				updatedChannels[0].data.head.links['has attached element'][1].data
					.mirrors;
			expect(mirrors).toStrictEqual(['www.google.com']);
		});
	});
	describe('mentionsUser', () => {
		test('returns true if user in mentionsUser array', () => {
			const user = {
				slug: 'user-1',
			};
			const card = {
				type: 'message',
				markers: [],
				data: {
					payload: {
						mentionsUser: [user.slug],
						mentionsGroup: ['group1'],
					},
				},
			};
			const groups = {
				group1: {
					name: 'group1',
					users: ['some-other-user'],
					isMine: false,
				},
			};
			expect(mentionsUser(card, user, groups)).toBe(true);
		});

		test("returns true if card type is 'message' and user in one of the markers", () => {
			const user = {
				slug: 'user-1',
			};
			const card = {
				type: 'message',
				markers: [`org-1+${user.slug}`],
				data: {
					payload: {
						mentionsUser: ['some-other-user'],
						mentionsGroup: ['group1'],
					},
				},
			};
			const groups = {
				group1: {
					name: 'group1',
					users: ['some-other-user'],
					isMine: false,
				},
			};
			expect(mentionsUser(card, user, groups)).toBe(true);
		});

		test('returns true if user in a group in the mentionsGroup array', () => {
			const user = {
				slug: 'user-1',
			};
			const card = {
				type: 'message',
				markers: [],
				data: {
					payload: {
						mentionsUser: ['some-other-user'],
						mentionsGroup: ['group1'],
					},
				},
			};
			const groups = {
				group1: {
					name: 'group1',
					users: [user.slug],
					isMine: true,
				},
			};
			expect(mentionsUser(card, user, groups)).toBe(true);
		});

		test('returns false if user not in mentionsUser array or in any group in mentionsGroup or in any markers', () => {
			const user = {
				slug: 'user-1',
			};
			const card = {
				type: 'message',
				markers: ['some-other-user'],
				data: {
					payload: {
						mentionsUser: ['some-other-user'],
						mentionsGroup: ['group1'],
					},
				},
			};
			const groups = {
				group1: {
					name: 'group1',
					users: ['some-other-user'],
					isMine: false,
				},
			};
			expect(mentionsUser(card, user, groups)).toBe(false);
		});
	});
});

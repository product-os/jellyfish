import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { Card } from '../../../Types';
import store from '../store';
import * as card from './card';
import { query } from './db';

let otherUsers: Card[] = [];

// This is really awakward and needs to be refactored, Ideally the SDK needs
// a botostrapping step once it authorises
store.subscribe(() => {
	if (_.get(store.getState(), 'session.authToken') && !otherUsers.length) {
		query({
			type: 'object',
			properties: {
				type: {
					const: 'user',
				},
				slug: {
					not: {
						const: 'user-guest',
					},
				},
			},
			additionalProperties: true,
		})
			.then((users) => {
				otherUsers = users;
			});
	}
});

export const listAll = () => otherUsers;

export const getUsername = (() => {
	const usernameCache: { [id: string]: string } = {};

	return (userId: string): Promise<string> => Promise.try(() => {
		if (usernameCache[userId]) {
			return usernameCache[userId];
		}

		return card.get(userId)
		.then((userCard) => {
			const username = userCard ? userCard.slug!.replace('user-', '') : 'unknown user';
			usernameCache[userId] = username;

			return username;
		});
	});
})();


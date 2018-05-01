import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { Card } from '../../../Types';
import { debug } from '../helpers';
import store, { actionCreators } from '../store';
import * as card from './card';
import { action, query } from './db';
import { getAll as getAllTypes } from './type';
import { getToken, postRequest } from './utils';

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

export const whoami = () => Promise.try(() => {
	const session = getToken();

	if (!session) {
		throw new Error('No session token found');
	}

	return card.get(session)
		.then((result) => {
			if (!result) {
				throw new Error('Could not retrieve session data');
			}
			return card.get(result.data.actor);
		});
});

export const signup = ({ username, email, password }: {
	username: string;
	email: string;
	password: string;
}) =>
	action({
		target: 'user',
		action: 'action-create-user',
		arguments: {
			email,
			username: `user-${username}`,
			hash: `{{ HASH({ string: "${password}", salt: properties.data.arguments.username }) }}`,
		},
	})
	.then(() => login({
		username,
		password,
	}));

export const login = (payload: {
	username: string;
	password: string;
}) =>
	postRequest('login', payload)
		.then((response) => {
			const responseData = response.data.data.results.data;
			if (response.data.data.results.error) {
				throw new Error(responseData);
			}

			const token = response.data.data.results.data;

			debug('GOT AUTH TOKEN', token);

			store.dispatch(actionCreators.setAuthToken(token));

			return Promise.all([
				whoami(),
				getAllTypes(),
			])
			.then(([user, types]) => {
				// Check to see if we're still logged in
				if (_.get(store.getState(), ['session', 'authToken'])) {
					store.dispatch(actionCreators.setUser(user!));
					store.dispatch(actionCreators.setTypes(types));
				}

				return user;
			})
			.catch((error) => console.error('A login error occurred', error));
		});

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


import * as Promise from 'bluebird';
import { debug } from '../helpers';
import store, { actionCreators } from '../store';
import * as card from './card';
import { action } from './db';
import { getAll as getAllTypes } from './type';
import { getToken, postRequest } from './utils';

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
		transient: {
			password,
		},
		arguments: {
			email,
			username: `user-${username}`,
			hash: `{{ HASH(properties.transient.password, properties.data.arguments.username) }}`,
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
				store.dispatch(actionCreators.setUser(user!));
				store.dispatch(actionCreators.setTypes(types));
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


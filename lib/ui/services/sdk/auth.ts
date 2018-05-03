import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { debug } from '../helpers';
import store, { actionCreators } from '../store';
import * as card from './card';
import { action } from './db';
import { getAll as getAllTypes } from './type';
import { getToken, post } from './utils';

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
			hash: {
				string: password,
				salt: `user-${username}`,
			},
		},
	})
	.then(() => login({
		username,
		password,
	}));

export const loginWithToken = (token: string) => {
	return card.get(token)
	.then(() => {
		return token;
	});
};

export const login = (payload: {
	username: string;
	password: string;
}) =>
	post('login', payload)
		.then((response) => {
			const responseData = response.data.data.results.data;
			if (response.data.data.results.error) {
				throw new Error(responseData);
			}

			const token = response.data.data.results.data;

			debug('GOT AUTH TOKEN', token);

			store.dispatch(actionCreators.setAuthToken(token));
			store.dispatch(actionCreators.setAuthorized());

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

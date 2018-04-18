import * as Promise from 'bluebird';
import { debug } from '../helpers';
import * as card from './card';
import { getAll as getAllTypes } from './type';
import { postRequest } from './utils';
import store, { actionCreators } from '../store';

export const signup = (payload: {
	username: string;
	email: string;
	password: string;
}) =>
	postRequest('signup', payload)
		.then(() => login({
			username: payload.username,
			password: payload.password,
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
				card.get(token)
				.then((result) => card.get(result!.data.actor))
				.then((userCard) => {
					debug('GOT USER', userCard);
					return userCard;
				}),
				getAllTypes(),
			])
			.then(([user, types]) => {
				store.dispatch(actionCreators.setUser(user!));
				store.dispatch(actionCreators.setTypes(types));
			});
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


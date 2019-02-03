/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird';
import { SDKInterface } from './index';
import { Card } from './types';
import { debug } from './utils';

// A regex used to test that a string contains only alphanumeric characters and
// dashes and is at least 5 characters long
const USERNAME_REGEX = /^[a-z0-9-]{5,}$/;

/**
 * @namespace JellyfishSDK.auth
 */
export class AuthSdk {
	constructor(private sdk: SDKInterface) {}

	/**
	 * @summary Get the currently authenticated user
	 * @name whoami
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Gets the user card of the currently authorised user using
	 * their auth token
	 *
	 * @fulfil {Object|null} - A single user card, or null if one wasn't found
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.auth.whoami()
	 * 	.then((user) => {
	 * 		console.log(user)
	 * 	})
	 */
	public whoami(): Bluebird<Card | null> {
		return Bluebird.try(() => {
			const session = this.sdk.getAuthToken();

			if (!session) {
				throw new Error('No session token found');
			}

			return this.sdk.card.get(session, { type: 'session' })
				.then((result) => {
					if (!result) {
						throw new Error('Could not retrieve session data');
					}
					return this.sdk.card.get(result.data.actor, { type: 'user' });
				});
		});
	}

	/**
	 * @summary Create a new user account
	 * @name signup
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Create a new user account and return the newly created user's
	 * id
	 *
	 * @fulfil {Object} - The newly created user
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.auth.signup({
	 * 	username: 'johndoe',
	 * 	email: 'johndoe@example.com',
	 * 	password: 'password123'
	 * })
	 * 	.then((id) => {
	 * 		console.log(id)
	 * 	})
	 */
	public signup({ username, email, password }: {
		username: string;
		email: string;
		password: string;
	}): Bluebird<Card> {
		// Normalize username and email to lower case
		username = username.toLowerCase();
		email = email.toLowerCase();

		if (!USERNAME_REGEX.test(username)) {
			throw new Error('Usernames can only contain alphanumeric characters and dashes, and must be at least 5 characters long');
		}

		return this.sdk.action<Card>({
			card: 'user',
			type: 'type',
			action: 'action-create-user',
			arguments: {
				email,
				username: `user-${username}`,
				hash: {
					string: password,
					salt: `user-${username}`,
				},
			},
		});
	}

	/**
	 * @summary Authenticate the SDK using a token
	 * @name loginWithToken
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Authenticate the SDK using a token. The token is checked for
	 * validity and then saved using `jellyFishSdk.setAuthToken` to be used for
	 * later requests. Once logged in, there is no need to set the token again
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.auth.loginWithToken('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then(() => {
	 * 		console.log('Authenticated')
	 * 	})
	 */
	public loginWithToken(token: string): Bluebird<void> {
		return this.sdk.card.get(token, { type: 'session' })
		.then(() => {
			this.sdk.setAuthToken(token);
		});
	}

	/**
	 * @summary Authenticate the SDK using a username and password
	 * @name login
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Authenticate the SDK using a username and password. If the
	 * username and password are valid, a user session card will be returned.
	 * The id of the user session id (which is used to authenticate requests) is
	 * then saved using `jellyFishSdk.setAuthToken` to be used for later requests.
	 * Once logged in, there is no need to set the token again
	 *
	 * @fulfils {Object} The generated user session
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.auth.login({
	 * 		username: 'johndoe',
	 * 		password: 'password123'
	 * 	})
	 * 	.then((session) => {
	 * 		console.log('Authenticated', session)
	 * 	})
	 */
	public login(options: {
		username: string;
		password: string;
	}): Bluebird<Card> {
		// Normalize username to lower case
		const slug = `user-${options.username}`.toLowerCase();

		const passwordArgument = options.password ?
			{
				hash: {
					string: options.password,
					salt: slug,
				},
			}
			: {};

		return this.sdk.action<Card>({
			card: slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: passwordArgument,
			},
		})
			.then((session) => {
				debug('GOT AUTH TOKEN', session.id);

				this.sdk.setAuthToken(session.id);

				return session;
			});
	}

	/**
	 * @summary Logout
	 * @name logout
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Logout, removing the current authToken and closing all
	 * streams and network requests
	 *
	 * @example
	 * sdk.auth.logout()
	 */
	public logout(): void {
		this.sdk.clearAuthToken();
		this.sdk.cancelAllRequests();
		this.sdk.cancelAllStreams();
	}
}

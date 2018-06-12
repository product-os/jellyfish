/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Bluebird from 'bluebird';
import { debug, SDKInterface } from './utils';

// A regex used to test that a string contains only alphanumeric characters and
// dashes and is at least 5 characters long
const USERNAME_REGEX = /^[a-z0-9-]{5,}$/;

export class AuthSdk {
	constructor(private sdk: SDKInterface) {}

	/**
	 * @summary Get the currently authenticated user
	 * @name whoami
	 * @public
	 * @function
	 * @memberof jellyfishSdk.auth
	 *
	 * @description Gets the user card of the currently authorised user using
	 * their auth token
	 *
	 * @fulfil {Object|null} - A single user card, or null if one wasn't found
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.auth.whoami()
	 * 	.then((user) => {
	 * 		console.log(user)
	 * 	})
	 */
	public whoami() {
		return Bluebird.try(() => {
			const session = this.sdk.getAuthToken();

			if (!session) {
				throw new Error('No session token found');
			}

			return this.sdk.card.get(session)
				.then((result) => {
					if (!result) {
						throw new Error('Could not retrieve session data');
					}
					return this.sdk.card.get(result.data.actor);
				});
		});
	}

	/**
	 * @summary Create a new user account
	 * @name signup
	 * @public
	 * @function
	 * @memberof jellyfishSdk.auth
	 *
	 * @description Create a new user account and return the newly created user's
	 * id
	 *
	 * @fulfil {String} - The id of the newly created user
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.auth.signup({
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
	}) {
		if (!USERNAME_REGEX.test(username)) {
			throw new Error('Usernames can only contain alphanumeric characters and dashes, and must be at least 5 characters long');
		}

		return this.sdk.action<string>({
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
		});
	}

	/**
	 * @summary Authenticate the SDK using a token
	 * @name loginWithToken
	 * @public
	 * @function
	 * @memberof jellyfishSdk.auth
	 *
	 * @description Authenticate the SDK using a token. The token is checked for
	 * validity and then saved using `jellyFishSdk.setAuthToken` to be used for
	 * later requests. Once logged in, there is no need to set the token again
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.auth.loginWithToken('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then(() => {
	 * 		console.log('Authenticated')
	 * 	})
	 */
	public loginWithToken(token: string) {
		return this.sdk.card.get(token)
		.then(() => {
			this.sdk.setAuthToken(token);
		});
	}

	/**
	 * @summary Authenticate the SDK using a username and password
	 * @name login
	 * @public
	 * @function
	 * @memberof jellyfishSdk.auth
	 *
	 * @description Authenticate the SDK using a username and password. If the
	 * username and password are valid, a token will be returned, which is then
	 * saved using `jellyFishSdk.setAuthToken` to be used for later requests.
	 * Once logged in, there is no need to set the token again
	 *
	 * @fulfils {String} The generate auth token
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.auth.login({
	 * 		username: 'johndoe',
	 * 		password: 'password123'
	 * 	})
	 * 	.then((token) => {
	 * 		console.log('Authenticated', token)
	 * 	})
	 */
	public login(options: {
		username: string;
		password: string;
	}) {
		const slug = `user-${options.username}`;

		const passwordArgument = options.password ?
			{
				hash: {
					string: options.password,
					salt: slug,
				},
			}
			: {};

		return this.sdk.action<string>({
			target: slug,
			action: 'action-create-session',
			arguments: {
				password: passwordArgument,
			},
		})
			.then((token) => {
				debug('GOT AUTH TOKEN', token);

				this.sdk.setAuthToken(token);

				return token;
			});
	}

	/**
	 * @summary Logout
	 * @name logout
	 * @public
	 * @function
	 * @memberof jellyfishSdk.auth
	 *
	 * @description Logout, removing the current authToken and closing all
	 * streams and network requests
	 *
	 * @example
	 * jellyfishSdk.auth.logout()
	 */
	public logout() {
		this.sdk.clearAuthToken();
		this.sdk.cancelAllRequests();
		this.sdk.cancelAllStreams();
	}
}

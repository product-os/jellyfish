import * as Promise from 'bluebird';
import { debug, SDKInterface } from './utils';

export class AuthSdk {
	constructor(private sdk: SDKInterface) {}

	public whoami() {
		return Promise.try(() => {
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
	 * Resolves with the newly created users id
	 */
	public signup({ username, email, password }: {
		username: string;
		email: string;
		password: string;
	}) {
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

	public loginWithToken(token: string) {
		return this.sdk.card.get(token)
		.then(() => {
			this.sdk.setAuthToken(token);
		});
	}

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
}

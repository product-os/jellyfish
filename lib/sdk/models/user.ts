import * as Promise from 'bluebird';
import { SDKInterface } from '../utils';

export class UserSdk {
	constructor(private sdk: SDKInterface) {}

	public getAll() {
		return this.sdk.query({
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
		});
	}

	public getUsername(userId: string): Promise<string> {
		return this.sdk.card.get(userId)
		.then((userCard) => {
			const username = userCard ? userCard.slug!.replace('user-', '') : 'unknown user';

			return username;
		});
	}
}

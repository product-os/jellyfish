import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { Card } from '../../Types';
import { SDKInterface } from './../utils';

export class SubscriptionSdk {
	constructor(private sdk: SDKInterface) {}

	public getByTargetAndUser(target: string, userId: string): Promise<Card | null> {
		return this.sdk.query({
			type: 'object',
			properties: {
				type: {
					const: 'subscription',
				},
				data: {
					type: 'object',
					properties: {
						target: {
							const: target,
						},
						actor: {
							const: userId,
						},
					},
					additionalProperties: true,
				},
			},
			additionalProperties: true,
		})
		.then((results) => _.first(results) || null);
	}
}

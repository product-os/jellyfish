import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../Types';
import { debug, isUUID, SDKInterface } from './utils';

export class CardSdk {
	constructor(private sdk: SDKInterface) {}

	public get(idOrSlug: string): Promise<Card | null> {
		debug(`Fetching card ${idOrSlug}`);

		if (isUUID(idOrSlug)) {
			return this.sdk.query({
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: idOrSlug,
					},
				},
				required: [ 'id' ],
				additionalProperties: true,
			})
			.then((results) => _.first(results) || null);
		}

		return this.sdk.query({
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: idOrSlug,
				},
			},
			required: [ 'slug' ],
			additionalProperties: true,
		})
			.then((results) => _.first(results) || null);
	}

	public getTimeline(id: string): Promise<Card[]> {
		const schema: JSONSchema6 = {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						target: {
							type: 'string',
							const: id,
						},
					},
					additionalProperties: true,
					required: [ 'target' ],
				},
			},
			additionalProperties: true,
			required: [ 'data' ],
		};

		return this.sdk.query(schema)
			.then(cards => _.sortBy<Card>(cards, (card) => card.data!.timestamp));
	}

	public add(card: Partial<Card> & { type: string }): Promise<{ id: string, results: any }> {
		return this.sdk.action({
			target: card.type,
			action: 'action-create-card',
			arguments: {
				properties: _.omit(card, ['type', 'id']),
			},
		})
			.then(response => response.data.data);
	}

	public update (id: string, body: Partial<Card>) {
		return this.sdk.action({
			target: id,
			action: 'action-update-card',
			arguments: {
				properties: _.omit(body, [ 'type', 'id' ]),
			},
		})
			.then(response => response.data.data);
	}

	public remove(id: string) {
		return this.sdk.action({
			target: id,
			action: 'action-delete-card',
		})
			.then(response => response.data.data);
	}
}

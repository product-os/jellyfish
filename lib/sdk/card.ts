import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../Types';
import { debug, isUUID, SDKInterface } from './utils';

export class CardSdk {
	constructor(private sdk: SDKInterface) {}

	public get(idOrSlug: string): Bluebird<Card | null> {
		debug(`Fetching card ${idOrSlug}`);

		const schema: JSONSchema6 = isUUID(idOrSlug) ? {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: idOrSlug,
					},
				},
				required: [ 'id' ],
				additionalProperties: true,
			} :
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string',
						const: idOrSlug,
					},
				},
				required: [ 'slug' ],
				additionalProperties: true,
			};

		return this.sdk.query(schema)
			.then(elements => _.first(elements) || null);
	}

	/**
	 * @summary Get all cards of a given type
	 */
	public getAllByType(cardType: string): Bluebird<Card[]> {
		const schema: JSONSchema6 = {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: cardType,
				},
			},
			required: [ 'slug' ],
			additionalProperties: true,
		};

		return this.sdk.query(schema);
	}

	public getTimeline(id: string): Bluebird<Card[]> {
		const schema: JSONSchema6 = {
			type: 'object',
			properties: {
				type: {
					not: {
						const: 'action-request',
					},
				},
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

		return this.sdk.query(schema);
	}

	/**
	 * Resolves with the ID of the created card
	 */
	public create(card: Partial<Card> & { type: string }): Bluebird<string> {
		return this.sdk.action<string>({
			target: card.type,
			action: 'action-create-card',
			arguments: {
				properties: _.omit(card, ['type']),
			},
		});
	}

	public update(id: string, body: Partial<Card>) {
		return this.sdk.action({
			target: id,
			action: 'action-update-card',
			arguments: {
				properties: _.omit(body, [ 'type', 'id' ]),
			},
		});
	}

	public remove(id: string) {
		return this.sdk.action({
			target: id,
			action: 'action-delete-card',
		});
	}
}

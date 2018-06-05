import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { concat, from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Card } from '../Types';
import { debug, isUUID, SDKInterface, SDKQueryOptions } from './utils';

export class CardSdk {
	constructor(private sdk: SDKInterface) {}

	public get(idOrSlug: string, options?: SDKQueryOptions): Observable<Card | null> {
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

		return this.sdk.query(schema, options).pipe(
			map(elements => _.first(elements) || null),
		);
	}

	/**
	 * @summary Get all cards of a given type
	 */
	public getAllByType(cardType: string, options?: SDKQueryOptions): Observable<Card[]> {
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

		return this.sdk.query(schema, options);
	}

	public getTimeline(id: string, options?: SDKQueryOptions): Observable<Card[]> {
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

		return this.sdk.query(schema, options);
	}

	/**
	 * Resolves with the ID of the created card
	 */
	public create(card: Partial<Card> & { type: string }): Observable<string> {
		const id = this.sdk.miniJelly.insert(card as Card);

		card.id = id;

		const backendRequest = this.sdk.action<string>({
			target: card.type,
			action: 'action-create-card',
			arguments: {
				properties: _.omit(card, ['type']),
			},
		});

		return concat(
			of(id),
			from(backendRequest),
		);
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
		this.sdk.miniJelly.remove(id);

		return from(this.sdk.action({
			target: id,
			action: 'action-delete-card',
		}));
	}
}

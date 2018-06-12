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
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../Types';
import { debug, isUUID, SDKInterface } from './utils';

export class CardSdk {
	constructor(private sdk: SDKInterface) {}

	/**
	 * @summary Get a card
	 * @name get
	 * @public
	 * @function
	 * @memberof jellyfishSdk.card
	 *
	 * @description Get a card using an id or a slug
	 *
	 * @param {String} idOrSlug - The id or slug of the card to retrieve
	 *
	 * @fulfil {Object|null} - A single card, or null if one wasn't found
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.card.get('user-johndoe')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 *
	 * jellyfishSdk.card.get('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 */
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
	 * @summary Get a all cards of a given type
	 * @name getAllByType
	 * @public
	 * @function
	 * @memberof jellyfishSdk.card
	 *
	 * @description Get all cards that have the provided 'type' attribute
	 *
	 * @param {String} type - The type of card to retrieve
	 *
	 * @fulfil {Object[]} - All cards of the given type
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.card.getAllByType('view')
	 * 	.then((cards) => {
	 * 		console.log(cards)
	 * 	})
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

	/**
	 * @summary Get the timeline for a card
	 * @name getTimeline
	 * @public
	 * @function
	 * @memberof jellyfishSdk.card
	 *
	 * @description Get all the timeline cards that target a card with the
	 * specified id
	 *
	 * @param {String} id - The id of the card to retrieve a timeline for
	 *
	 * @fulfil {Object[]} - A set of timeline cards
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.card.getTimeline('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then((timeline) => {
	 * 		console.log(timeline)
	 * 	})
	 */
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
	 * @summary Create a new card
	 * @name create
	 * @public
	 * @function
	 * @memberof jellyfishSdk.card
	 *
	 * @description Send an action request to create a new card
	 *
	 * @param {Object} card - The card that should be created, must include
	 * a 'type' attribute.
	 *
	 * @fulfil {String} - The id of the newly created card
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.card.create({
	 * 	type: 'thread',
	 * 	data: {
	 * 		description: 'lorem ipsum dolor sit amet'
	 * 	}
	 * })
	 * 	.then((id) => {
	 * 		console.log(id)
	 * 	})
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

	/**
	 * @summary Update a card
	 * @name update
	 * @public
	 * @function
	 * @memberof jellyfishSdk.card
	 *
	 * @description Send an action request to update a card
	 *
	 * @param {String} id - The id of the card that should be updated
	 * @param {Object} body - An object that will be used to update the card
	 *
	 * @fulfil {Object} - An action response object
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.card.update('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', {
	 * 	data: {
	 * 		description: 'foo bar baz'
	 * 	}
	 * })
	 * 	.then((response) => {
	 * 		console.log(response)
	 * 	})
	 */
	public update(id: string, body: Partial<Card>) {
		return this.sdk.action({
			target: id,
			action: 'action-update-card',
			arguments: {
				properties: _.omit(body, [ 'type', 'id' ]),
			},
		});
	}

	/**
	 * @summary Remove a card
	 * @name remove
	 * @public
	 * @function
	 * @memberof jellyfishSdk.card
	 *
	 * @description Send an action request to remove a card
	 *
	 * @param {String} id - The id of the card that should be remove
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.card.remove('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 */
	public remove(id: string) {
		return this.sdk.action({
			target: id,
			action: 'action-delete-card',
		});
	}
}

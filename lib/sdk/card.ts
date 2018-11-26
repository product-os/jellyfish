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
import uuid = require('uuid/v4');
import { Card } from '../types';
import { SDKInterface } from './index';
import { debug, isUUID } from './utils';

// A map of link names and their synonymous form
const linkNameMap = {
	'is attached to': 'has attached element',
	'scratchpad entry was used in support thread': 'support thread used scratchpad entry',
	'support thread used scratchpad entry': 'scratchpad entry was used in support thread',
	'support thread has attached issue': 'issue is attached to support thread',
	'support thread has attached symptom': 'symptom is attached to support thread',
	'architecture topic has attached issue': 'issue is attached to architecture topic',
	'issue is attached to architecture topic': 'architecture topic has attached issue',
	'architecture topic has attached spec': 'spec is attached to architecture topic',
	'issue is attached to spec': 'spec has attached issue',
	'spec has attached issue': 'issue is attached to spec',
	'spec is attached to architecture topic': 'architecture topic has attached spec',
	'is member of': 'has member',
};

const createDefaultCard = (type: string) => ({
	slug: `${type}-${uuid()}`,
	version: '1.0.0',
	active: true,
	tags: [],
	markers: [],
	links: {},
	requires: [],
	capabilities: [],
	data: {},
});

/**
 * @namespace JellyfishSDK.card
 */
export class CardSdk {
	constructor(private sdk: SDKInterface) {}

	/**
	 * @summary Get a card
	 * @name get
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Get a card using an id or a slug
	 *
	 * @param {String} idOrSlug - The id or slug of the card to retrieve
	 * @param {Object} options - Extra query options to use
	 * @param {Object} [options.schema] - Additional schema that will be merged
	 * into the query
	 *
	 * @fulfil {Object|null} - A single card, or null if one wasn't found
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.get('user-johndoe')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 *
	 * sdk.card.get('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 */
	public get(idOrSlug: string, options: any = {}): Bluebird<Card | null> {
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

		_.merge(schema, options.schema);

		return this.sdk.query(schema)
			.then(elements => _.first(elements) || null);
	}

	/**
	 * @summary Get a card and its attached timeline
	 * @name get
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Get a card and its timeline using an id or a slug
	 *
	 * @param {String} idOrSlug - The id or slug of the card to retrieve
	 *
	 * @fulfil {Object|null} - A single card, or null if one wasn't found
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.getWithTimeline('user-johndoe')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 *
	 * sdk.card.getWithTimeline('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 */
	public getWithTimeline(idOrSlug: string): Bluebird<Card | null> {
		return this.get(idOrSlug, {
			schema: {
				$$links: {
					'has attached element': {
						type: 'object',
						additionalProperties: true,
					},
				},
				properties: {
					links: {
						type: 'object',
						additionalProperties: true,
					},
				},
			},
		});
	}

	/**
	 * @summary Get all cards of a given type
	 * @name getAllByType
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Get all cards that have the provided 'type' attribute
	 *
	 * @param {String} type - The type of card to retrieve
	 *
	 * @fulfil {Object[]} - All cards of the given type
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.getAllByType('view')
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
			required: [ 'type' ],
			additionalProperties: true,
		};

		return this.sdk.query(schema);
	}

	/**
	 * @summary Create a new card
	 * @name create
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Send an action request to create a new card
	 *
	 * @param {Object} card - The card that should be created, must include
	 * a 'type' attribute.
	 *
	 * @fulfil {Card} - The newly created card
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.create({
	 * 	type: 'thread',
	 * 	data: {
	 * 		description: 'lorem ipsum dolor sit amet'
	 * 	}
	 * })
	 * 	.then((id) => {
	 * 		console.log(id)
	 * 	})
	 */
	public create(card: Partial<Card> & { type: string }): Bluebird<Card> {
		return this.sdk.action<Card>({
			card: card.type,
			action: 'action-create-card',
			arguments: {
				properties: _.assign(
					createDefaultCard(card.type),
					_.omit(card, ['type']),
				),
			},
		});
	}

	/**
	 * @summary Update a card
	 * @name update
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
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
	 * sdk.card.update('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', {
	 * 	data: {
	 * 		description: 'foo bar baz'
	 * 	}
	 * })
	 * 	.then((response) => {
	 * 		console.log(response)
	 * 	})
	 */
	public update(id: string, card: Partial<Card> & { type: string }): Bluebird<any> {
		return this.sdk.action({
			card: id,
			action: 'action-update-card',
			arguments: {
				properties: _.assign(
					createDefaultCard(card.type),
					_.omit(card, [ 'type', 'id' ]),
				),
			},
		});
	}

	/**
	 * @summary Remove a card
	 * @name remove
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Send an action request to remove a card
	 *
	 * @param {String} id - The id of the card that should be remove
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.remove('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 */
	public remove(id: string): Bluebird<any> {
		return this.sdk.action({
			card: id,
			action: 'action-delete-card',
		});
	}

	/**
	 * @summary Create a link card
	 * @name remove
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Link two cards together
	 *
	 * @param {String} from - The id of the card that should be linked from
	 * @param {String} to - The id of the card that should be linked to
	 * @param {String} name - The name of the relationship
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.link(
	 *   '8b465c9a-b4cb-44c1-9df9-632649d7c4c3',
	 *   '3fb768e9-3069-4bb4-bf17-516ebbd00757',
	 *   'is attached to'
	 * )
	 */
	public link(fromCard: string, toCard: string, name: keyof typeof linkNameMap): Bluebird<any> {
		return this.sdk.action<Card>({
			card: 'link',
			action: 'action-create-card',
			arguments: {
				properties: {
					slug: `link-${fromCard}-${name.replace(/\s/g, '-')}-${toCard}`,
					tags: [],
					version: '1.0.0',
					links: {},
					requires: [],
					capabilities: [],
					active: true,
					name,
					data: {
						inverseName: linkNameMap[name],
						from: fromCard,
						to: toCard,
					},
				},
			},
		});
	}
}

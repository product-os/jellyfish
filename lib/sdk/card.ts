/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { SDKInterface } from './index';
import { Card, JellySchema } from './types';
import { isUUID } from './utils';

// A map of link names and their synonymous form
const linkNameMap = {
	'is attached to': 'has attached element',
	'support thread is attached to support issue': 'support thread has attached support issue',
	'support thread has attached support issue': 'support thread is attached to support issue',
	'support thread has attached issue': 'issue is attached to support thread',
	'support thread has attached symptom': 'symptom is attached to support thread',
	'architecture topic has attached issue': 'issue is attached to architecture topic',
	'issue is attached to architecture topic': 'architecture topic has attached issue',
	'architecture topic has attached spec': 'spec is attached to architecture topic',
	'issue is attached to spec': 'spec has attached issue',
	'spec has attached issue': 'issue is attached to spec',
	'spec is attached to architecture topic': 'architecture topic has attached spec',
	'is member of': 'has member',
	'has member': 'is member of',
};

interface Options {
	type?: 'string';
	schema?: JellySchema;
}

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
	public get(idOrSlug: string, options: Options = {}): Bluebird<Card | null> {
		const schema: JellySchema = isUUID(idOrSlug) ? {
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

		if (options.type) {
			schema.properties!.type = {
				type: 'string',
				const: options.type,
			};
		}

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
	public getWithTimeline(idOrSlug: string, options: Options = {}): Bluebird<Card | null> {
		const { schema, ...rest } = options;
		return this.get(idOrSlug, {
			schema: _.merge(schema, {
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
			}),
			...rest,
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
		const schema: JellySchema = {
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
			type: 'type',
			action: 'action-create-card',
			arguments: {
				properties: _.omit(card, [ 'type' ]),
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
			type: card.type,
			action: 'action-update-card',
			arguments: {
				properties: _.omit(card, [ 'type', 'id' ]),
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
	 * @param {String} id - The id of the card that should be removed
	 * @param {String} type - The type of the card that should be removed
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.remove('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', 'card')
	 */
	public remove(id: string, type: string): Bluebird<any> {
		return this.sdk.action({
			card: id,
			type,
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
	public link(
		fromCard: Partial<Card> & { type: string, id: string },
		toCard: Partial<Card> & { type: string, id: string },
		name: keyof typeof linkNameMap,
	): Bluebird<any> {
		if (!fromCard.id) {
			throw new Error(`No id in "from" card: ${JSON.stringify(fromCard)}`);
		}

		if (!toCard.id) {
			throw new Error(`No id in "to" card: ${JSON.stringify(toCard)}`);
		}

		return this.sdk.action<Card>({
			card: 'link',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				properties: {
					slug: `link-${fromCard.id}-${name.replace(/\s/g, '-')}-${toCard.id}`,
					tags: [],
					version: '1.0.0',
					links: {},
					requires: [],
					capabilities: [],
					active: true,
					name,
					data: {
						inverseName: linkNameMap[name],
						from: {
							id: fromCard.id,
							type: fromCard.type,
						},
						to: {
							id: toCard.id,
							type: toCard.type,
						},
					},
				},
			},
		});
	}
}

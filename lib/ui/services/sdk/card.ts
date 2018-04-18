import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../../../Types';
import { debug } from '../helpers';
import { action, query } from './db';
import { isUUID } from './utils';

export const get = (idOrSlug: string): Promise<Card | null> => {
	debug(`Fetching card ${idOrSlug}`);

	if (isUUID(idOrSlug)) {
		return query({
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

	return query({
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
};

export const getTimeline = (id: string): Promise<Card[]> => {
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

	return query(schema)
		.then(cards => _.sortBy<Card>(cards, (card) => card.data!.timestamp));
};

export const add = (card: Partial<Card> & { type: string }): Promise<{ id: string, results: any }> =>
	action({
		target: card.type,
		action: 'action-create-card',
		arguments: {
			properties: _.omit(card, ['type', 'id']),
		},
	})
		.then(response => response.data.data);

export const update = (id: string, body: Partial<Card>): Promise<Card> =>
	action({
		target: id,
		action: 'action-update-card',
		arguments: {
			properties: _.omit(body, [ 'type', 'id' ]),
		},
	})
		.then(response => response.data.data);

export const remove = (id: string): Promise<Card> =>
	action({
		target: id,
		action: 'action-delete-card',
	})
		.then(response => response.data.data);


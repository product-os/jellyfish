import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../../Types';
import { sdk } from '../core';
import { getViewSchema } from './helpers';

export const loadSchema = async (query: string | Card | JSONSchema6) => {
	if (_.isString(query)) {
		return await sdk.card.get(query)
			.then(getViewSchema);
	}

	if (query.type === 'view') {
		return getViewSchema(query as Card);
	}

	return query as JSONSchema6;
};


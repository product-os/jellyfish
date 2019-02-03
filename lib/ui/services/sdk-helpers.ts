/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { sdk } from '../core';
import { Card } from '../types';
import { getViewSchema } from './helpers';

export const loadSchema = async (query: string | Card | JSONSchema6) => {
	if (_.isString(query)) {
		return await sdk.card.get(query, {
			type: 'view',
		} as any)
			.then(getViewSchema);
	}

	if (query.type === 'view') {
		return getViewSchema(query as Card);
	}

	return query as JSONSchema6;
};


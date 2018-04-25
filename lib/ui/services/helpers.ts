import * as _ from 'lodash';
import uuid = require('uuid/v4');
import { Channel } from '../../Types';

const PURPLE = '#8268c5';

const DEBUG =	process.env.NODE_ENV !== 'production';

export const debug = (...params: any[]) => {
	if (DEBUG) {
		console.log('%cjellyfish:ui', `color: ${PURPLE};`, ...params);
	}
};

export const createChannel = (data: Channel['data']): Channel => ({
	id: uuid(),
	type: 'channel',
	tags: [],
	links: [],
	active: true,
	data: {
		...data,
	},
});

/**
 * @summary Get the current timestamp
 * @function
 * @public
 *
 * @returns {String} RFC 3339 timestamp
 *
 * @example
 * const timestamp = helpers.getCurrentTimestamp()
 */
export const getCurrentTimestamp = () => {
	const currentDate = new Date();
	return currentDate.toISOString();
};

export const getTypeFromViewCard = (card: any) => {
	// Default to the `card` type, which will give a sensible schema
	let value: string = 'card';

	if (card.data.allOf) {
		for (const item of card.data.allOf) {
			let found = _.get(item.schema, 'properties.type.const');
			if (found) {
				value = found;
				break;
			}
			if (item.schema.anyOf) {
				for (const subschema of item.schema.anyOf) {
					found = _.get(subschema, 'properties.type.const');
					if (found) {
						break;
					}
				}
			}
			if (found) {
				value = found;
				break;
			}
		}
	}

	if (!value && card.data.oneOf) {
		for (const item of card.data.allOf) {
			let found = _.get(item.schema, 'properties.type.const');
			if (found) {
				value = found;
				break;
			}
		}
	}

	return value;
}

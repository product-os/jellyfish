import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as skhema from 'skhema';
import uuid = require('uuid/v4');
import { Card, Channel } from '../../Types';

const PURPLE = '#8268c5';

const DEBUG =	!_.includes([
	'test',
], process.env.NODE_ENV);

export const debug = (...params: any[]) => {
	if (DEBUG) {
		console.log('%cjellyfish:ui', `color: ${PURPLE};`, ...params);
	}
};

export const createChannel = (data: Channel['data']): Channel => ({
	id: uuid(),
	type: 'channel',
	tags: [],
	links: {},
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

	// First check if the view has explicitly declared a type
	if (!_.isEmpty(card.data.types)) {
		return _.first(card.data.types);
	}

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
			const found = _.get(item.schema, 'properties.type.const');
			if (found) {
				value = found;
				break;
			}
		}
	}

	return value;
};

const TODAY = moment().startOf('day');
const isToday = (momentDate: moment.Moment)  => {
	return momentDate.isSame(TODAY, 'd');
};

export const formatTimestamp = _.memoize((stamp: string): string => {
	const momentDate = moment(stamp);
	if (isToday(momentDate)) {
		return momentDate.format('k:mm');
	}

	return momentDate.format('ddd Do, YYYY k:mm');
});

export const findUsernameById = (users: Card[], id: string) => {
		const actor = _.find(users, { id });
		return actor ?
			actor.slug!.replace('user-', '') :
			'unknown user';
};

/**
 * @summary Get the schema of a view card
 * @function
 *
 * @param {Object} card - view card
 * @returns {(Object|Null)} schema
 *
 * @example
 * const card = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'view-all')
 * const schema = permissionFilter.getViewSchema(card)
 * console.log(schema)
 */
export const getViewSchema = (card: Card) => {
	if (!card) {
		return null;
	}

	const conjunctions = _.map(_.get(card, [ 'data', 'allOf' ]), 'schema');
	const disjunctions = _.map(_.get(card, [ 'data', 'anyOf' ]), 'schema');

	if (_.isEmpty(conjunctions) && _.isEmpty(disjunctions)) {
		return null;
	}

	if (!_.isEmpty(disjunctions)) {
		conjunctions.push({
			anyOf: disjunctions,
		});
	}

	return skhema.merge(conjunctions);
};

/**
 * @summary Parse a schema to produce an update object
 * @function
 * @description Is able to parse `const` and `contains` keywords.
 * The `contains` keyword is only parsed if it contains a `const` keyword, in
 * which case it will produce an array containing a single item.
 *
 * @param {Object} schema - A JSON schema
 * @returns {(Object)} An update object
 *
 * @example
 * const schema = {
 * 	type: 'object',
 * 	properties: {
 * 		number: {
 * 			const: 1
 * 		}
 * 	}
 * }
 * const update = getUpdateObjectFromSchema(schema)
 * console.log(update) //--> { number: 1 }
 */
export const getUpdateObjectFromSchema = (schema: JSONSchema6): { [k: string]: any } => {
	const update: { [k: string]: any } = {};
	_.forEach(schema.properties, (value: JSONSchema6, key) => {
		if (value.const) {
			update[key] = value.const;
		}
		if (value.contains && (value.contains as JSONSchema6).const) {
			update[key] = [ (value.contains as JSONSchema6).const ];
		}
		if (value.type === 'object') {
			update[key] = getUpdateObjectFromSchema(value);
		}
	});

	return update;
};

/**
 * @summary Retrieve a localSchema from a card
 * @function
 *
 * @param {Object} card - A card object
 * @return {Object} A JSON schema
 */
export const getLocalSchema = (card: any) => {
	return _.get(card, 'data.$$localSchema') || {
		type: 'object',
		properties: {},
	};
};

export const createPrefixRegExp = _.memoize((prefix: string) => {
	const regExp = new RegExp(`(^|\\s)(\\${prefix})([a-z\\d-\\/]+)`, 'gmi');
	return regExp;
});

/**
 * @summary match words prefixed with a specific value
 *
 * @param {String} prefix - The prefix used
 * @param {String} source - The text to analyse
 *
 * @return {String[]} An array of matching strings
 */
export const findWordsByPrefix = (prefix: string, source: string): string[] => {
	const regExp = createPrefixRegExp(prefix);
	return _.compact(source.match(regExp));
};


/**
 * @summary match usernames using a prefix and map them to ids
 *
 * @param {String} prefix - The prefix used to indicate a username
 * @param {String} source - The text to analyse
 * @param {Object[]} users - An array of user cards
 *
 * @return {String[]} An array of mathched user ids
 */
export const getUserIdsByPrefix = (prefix: string, source: string, users: Card[]): string[] => {
	return _.chain(findWordsByPrefix(prefix, source))
		.map((name) => {
			const slug = name.replace(prefix, 'user-');
			return _.get(_.find(users, { slug }), 'id');
		})
		.compact()
		.value();
};

/**
 * @summary Convert a string into a 32bit hashcode
 *
 * @param {String} input - The input source to hash
 *
 * @return {Number} - A 32bit integer
 */
export const hashCode = (input: string) => {
	let hash = 0;
	let iteration = 0;
	let character;
	if (input.length === 0) {
		return hash;
	}
	for (iteration; iteration < input.length; iteration++) {
		character = input.charCodeAt(iteration);
		hash  = ((hash << 5) - hash) + character;
		// Convert to 32bit integer
		hash |= 0;
	}
	return hash;
};

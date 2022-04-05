import ColorHash from 'color-hash';
import emoji from 'node-emoji';
import clone from 'deep-copy';
import * as jsonpatch from 'fast-json-patch';
import jsone from 'json-e';
import { v4 as isUUID } from 'is-uuid';
import * as _ from 'lodash';
import isValid from 'date-fns/isValid';
import isToday from 'date-fns/isToday';
import format from 'date-fns/format';
import isPast from 'date-fns/isPast';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import path from 'path';
import { SchemaSieve } from 'rendition';
import skhema from 'skhema';
import { DetectUA } from 'detect-ua';
import { MESSAGE, WHISPER, SUMMARY, RATING } from '../components/constants';
import { Channel, JSONPatch, UIActor } from '../types';
import type { JsonSchema } from '@balena/jellyfish-types';
import type {
	Contract,
	ContractData,
	LinkContract,
	TypeContract,
	UserContract,
	ViewContract,
} from '@balena/jellyfish-types/build/core';

export const createPermaLink = (card: Contract) => {
	const versionSuffix = card.version !== '1.0.0' ? `@${card.version}` : '';
	return `${window.location.origin}/${card.slug}${versionSuffix}`;
};

export const slugify = (value: string) => {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-');
};

export const isCustomView = (view: ViewContract, userSlug: string) => {
	return (
		view.slug.startsWith('view-user-created-view') &&
		view.markers.length === 1 &&
		view.markers[0] === userSlug
	);
};

export const pathWithoutTarget = (target: string) => {
	const filtered = Reflect.apply(
		path.join,
		null,
		window.location.pathname.split('/').filter((part) => {
			const identifier = part.split('...')[0];
			return identifier !== target;
		}),
	);

	return `/${filtered}`;
};

export const pathWithoutChannel = (channel: Channel) => {
	return pathWithoutTarget(channel.data.target);
};

/**
 * Returns the best available (human readable) reference to a card.
 *
 * Priority is defined like this:
 * versioned slug > slug > version
 *
 * @param {Object} card - The card to reference
 * @returns {String} a reference to the card
 */
export const cardReference = (card: any) => {
	if (card.slug && card.version) {
		return `${card.slug}@${card.version}`;
	}
	return card.slug || card.id;
};

export const appendToChannelPath = (channel: Channel, card: Contract) => {
	const parts: string[] = [];
	const pieces = window.location.pathname.split('/');
	const target = _.get(channel, ['data', 'target']);

	for (const piece of pieces) {
		parts.push(piece);
		if (target === piece.split('...')[0]) {
			break;
		}
	}

	parts.push(cardReference(card));

	const route = Reflect.apply(path.join, null, parts);

	return `/${route}`;
};

const getTypesFromSchema = (schema: JsonSchema): string[] => {
	const types =
		_.get(schema, ['properties', 'type', 'const']) ||
		_.get(schema, ['properties', 'type', 'enum']);
	return types && _.castArray(types);
};

/**
 * Extracts an array of types that are defined in the view card's filter definition
 *
 * @param {Object} card - the view card
 *
 * @returns {String[]} - an array of types that are defined in the view card's filter
 */
export const getTypesFromViewCard = (card: ViewContract) => {
	let value: string[] = [];

	// First check if the view has explicitly declared types
	if (!_.isEmpty(card.data.types)) {
		return _.castArray(card.data.types);
	}

	if (card.data.allOf) {
		for (const item of card.data.allOf) {
			let found = getTypesFromSchema(item.schema);
			if (found) {
				value = found;
				break;
			}
			if (typeof item.schema === 'object' && item.schema.anyOf) {
				for (const subschema of item.schema.anyOf) {
					found = getTypesFromSchema(subschema);
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
	if (!value.length && card.data.oneOf) {
		for (const item of card.data.oneOf) {
			const found = getTypesFromSchema(item.schema);
			if (found) {
				value = found;
				break;
			}
		}
	}

	// Default to the `card` type, which will give a sensible schema
	return value.length > 0 ? _.uniq(value) : ['card'];
};

export const formatTimestamp = (stamp: number | string, prefix = false) => {
	const timestamp = new Date(stamp);
	const today = isToday(timestamp);
	const dateText = today
		? format(timestamp, 'HH:mm')
		: format(timestamp, 'MMM do, yyyy HH:mm');
	if (!prefix) {
		return dateText;
	}
	return `${today ? 'at' : 'on'} ${dateText}`;
};

export const timeAgo = (
	stamp?: number | string | null,
	withoutSuffix = false,
) => {
	if (!stamp) {
		return '';
	}
	const timestamp = new Date(stamp);
	if (!isValid(timestamp)) {
		return '';
	}
	const distance = formatDistanceToNow(timestamp);
	if (withoutSuffix) {
		return distance;
	}
	return isPast(timestamp) ? `${distance} ago` : `in ${distance}`;
};

// Only consider objects with $eval
export const evalSchema = (object: { [key: string]: any }, context: any) => {
	if (!object) {
		return object;
	}

	if (object.$eval) {
		return jsone(object, context);
	}

	if (object.$id) {
		Reflect.deleteProperty(object, '$id');
	}

	for (const key of Object.keys(object)) {
		// For performance reasons
		// eslint-disable-next-line lodash/prefer-lodash-typecheck
		if (typeof object[key] !== 'object') {
			continue;
		}

		object[key] = evalSchema(object[key], context);
	}

	return object;
};

/**
 * Merges the schemas from multiple type cards.
 *
 * Note - the return object is a new (cloned) object
 *
 * @param {...Object} typeCards - the type cards to merge
 *
 * @returns {Object} - the merged schemas
 */
export const getMergedSchema = (...typeCards: TypeContract[]): JsonSchema => {
	const schemas = _.map(typeCards || {}, (typeCard) => {
		return _.get(typeCard, ['data', 'schema'], {});
	});
	// TS-TODO: `skhema.merge` accepts JSONShema6
	return clone(skhema.merge(schemas as any) as any);
};

/**
 * @summary Get the schema of a view card
 * @function
 *
 * @param {Object} card - view card
 * @param {Object} user - user card
 * @returns {(Object|Null)} schema
 *
 * @example
 * const card = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'view-all')
 * const schema = permissionFilter.getViewSchema(card)
 * console.log(schema)
 */
export const getViewSchema = (card: ViewContract, user: UserContract) => {
	if (!card) {
		return null;
	}
	const conjunctions = _.map(_.get(card, ['data', 'allOf']), 'schema');
	const disjunctions = _.map(_.get(card, ['data', 'anyOf']), 'schema');
	if (_.isEmpty(conjunctions) && _.isEmpty(disjunctions)) {
		return null;
	}
	if (!_.isEmpty(disjunctions)) {
		conjunctions.push({
			anyOf: disjunctions,
		});
	}

	// // TS-TODO: according to `skhema.merge` types, it receives only 1 argument.
	const view = (skhema.merge as any)(conjunctions, {
		resolvers: {
			$$links: (
				values: Array<{
					[key: string]: JsonSchema;
				}>,
			): {
				[key: string]: JsonSchema;
			} => {
				// For the $$links items, we need to merge schemas that have the same 'link verb'.
				const linkVerbs = _.uniq(_.flatMap(values, (value) => _.keys(value)));

				const mergedSchema: {
					[key: string]: JsonSchema;
				} = {};

				// For a particular link verb, if there are multiple 'values' which define a schema for that link verb,
				// we combine them in an 'allOf' array; otherwise just set the schema for that link verb to the only
				_.forEach(linkVerbs, (linkVerb) => {
					const linkVerbSchemas: JsonSchema[] = [];
					_.reduce(
						values,
						(schemas, value) => {
							if (value[linkVerb]) {
								schemas.push(value[linkVerb]);
							}
							return schemas;
						},
						linkVerbSchemas,
					);

					if (linkVerbSchemas.length > 1) {
						mergedSchema[linkVerb] = {
							type: 'object',
							allOf: linkVerbSchemas,
						};
					} else if (linkVerbSchemas.length === 1) {
						mergedSchema[linkVerb] = linkVerbSchemas[0];
					}
				});
				return mergedSchema;
			},
		},
	});

	return evalSchema(view, {
		user,
	});
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
export const getUpdateObjectFromSchema = (schema: JsonSchema) => {
	if (typeof schema === 'boolean') {
		return {};
	}

	const update: { [key: string]: any } = {};
	_.forEach(schema.properties, (value: JsonSchema, key) => {
		if (typeof value === 'boolean') {
			return;
		}

		if (value.const) {
			update[key] = value.const;
		}
		if (
			value.contains &&
			typeof value.contains === 'object' &&
			value.contains.const
		) {
			update[key] = [value.contains.const];
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
 * @returns {Object} A JSON schema
 */
export const getLocalSchema = (card: any) => {
	return (
		_.get(card, ['data', '$$localSchema']) || {
			type: 'object',
			properties: {},
		}
	);
};

export const replaceEmoji = (messageText: string) => {
	return emoji.emojify(messageText, (missing) => {
		return `:${missing}:`;
	});
};

export const TAG_MATCH_REGEXP_PREFIX = '@{1,2}|#|!{1,2}';

export const createPrefixRegExp = (prefix: string) => {
	const regExp = new RegExp(
		`(\\s|^)((${prefix})[a-z\\d-_\\/]+(\\.[a-z\\d-_\\/]+)*)`,
		'gmi',
	);
	return regExp;
};

/**
 * @summary match words prefixed with a specific value
 *
 * @param {String} prefix - The prefix used
 * @param {String} source - The text to analyse
 *
 * @returns {String[]} An array of matching strings
 */
export const findWordsByPrefix = (prefix: string, source: string) => {
	const regExp = createPrefixRegExp(prefix);
	return _.invokeMap(_.compact(source.match(regExp)), 'trim');
};

/**
 * @summary match keys using a prefix and map them to the keys themselves
 *
 * @param {String} prefix - The prefix used to indicate a key
 * @param {String} source - The text to analyse
 * @param {String} replacement - The string to replace the prefix with
 *
 * @returns {String[]} An array of matched keys
 */
export const getSlugsByPrefix = (
	prefix: string,
	source: string,
	replacement = '',
) => {
	const words = findWordsByPrefix(prefix, source);

	return _.uniq(
		words.map((name) => {
			return name.trim().replace(prefix, replacement);
		}),
	);
};

export const getObjectValues = (input: any): any[] => {
	if (_.isPlainObject(input)) {
		const result = _.map(input, (value) => {
			return getObjectValues(value);
		});
		return _.filter(_.flatten(result), _.isString);
	}

	return input;
};

export interface SliceOption {
	title: string;
	path: string;
	values: string[];
	names?: string[];
}

/**
 * Given a schema, find the corresponding type it queries for, and if the query "slices" on an enum type
 * return a set of schemas that represent a distinct query for each value in the enum.
 *
 * @param {JsonSchema} schema - The schema to inspect
 * @param {TypeContract} types - An array of type contracts
 *
 * @returns {JsonSchema[] | null} - An array of schemas that can be combined with the original query to
 * produce a "slice" of results. Null if slices cannot be calculated.
 */
export const getSchemaSlices = (
	schema: JsonSchema,
	types: TypeContract[],
): JsonSchema[] | null => {
	if (typeof schema === 'boolean') {
		return null;
	}
	const typeSlug =
		_.get(schema, ['properties', 'type', 'const']) ||
		_.get(schema, ['properties', 'type', 'enum', 0]);

	if (!typeSlug) {
		// If no slug was found and `allOf` is used, recurse into the first `allOf` branch
		if (schema.allOf) {
			return getSchemaSlices(schema.allOf[0], types);
		}
		return null;
	}
	const typeContract = _.find(types, {
		slug: typeSlug.split('@')[0],
	});

	if (!typeContract || !typeContract.data.slices) {
		return null;
	}

	const slices: JsonSchema[] = _.flatten(
		_.compact(
			_.map(typeContract.data.slices as string[], (slice) => {
				const subSchema = _.get(typeContract.data.schema, slice);
				// Only enums are supported
				if (!subSchema || !subSchema.enum) {
					return null;
				}

				const title = subSchema.title || slice.split('.').pop();

				// Map the subschema enums into seperate schemas that select for a specific value
				return subSchema.enum.map((value, index) => {
					const label = subSchema.enumNames
						? subSchema.enumNames[index]
						: value;
					const filter = _.set(
						{
							$id: slice,
							title: 'is',
							description: `${title} is ${label}`,
							type: 'object',
						},
						slice,
						{
							const: value,
						},
					);

					const keys = slice.split('.');
					const origKeys = _.clone(keys);

					// Make sure that "property" keys correspond with { type: 'object' },
					// and specify the required field as well
					// otherwise the filter won't work
					while (keys.length) {
						if (keys.pop() === 'properties') {
							const fieldName = _.get(origKeys, keys.length + 1);
							_.set(filter, keys.concat('type'), 'object');
							if (fieldName) {
								_.set(filter, keys.concat('required'), [fieldName]);
							}
						}
					}

					return filter;
				});
			}),
		),
	);

	return slices;
};

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

export const regexEscape = (str: string) => {
	return str.replace(matchOperatorsRe, '\\$&');
};

const isStringItem = (item: JsonSchema) => {
	return (
		item === true ||
		(typeof item === 'object' &&
			(item.type === 'string' ||
				(_.isArray(item.type) && _.includes(item.type, 'string'))))
	);
};

const isArrayOfStringsItem = (item: JsonSchema) => {
	return (
		item === true ||
		(typeof item === 'object' &&
			item.type === 'array' &&
			item.items &&
			isStringItem(item.items as JsonSchema))
	);
};

const getItemSearchQuery = (term: string, fullTextSearch: boolean) => {
	return fullTextSearch
		? {
				fullTextSearch: {
					term,
				},
		  }
		: {
				regexp: {
					pattern: regexEscape(term),
					flags: 'i',
				},
		  };
};

const getSearchableFieldQuerySchema = (item: any, term: string) => {
	return isStringItem(item)
		? {
				type: 'string',
				...getItemSearchQuery(term, Boolean(item.fullTextSearch)),
		  }
		: {
				type: 'array',
				contains: {
					...getItemSearchQuery(term, Boolean(item.fullTextSearch)),
				},
		  };
};

// TODO normalize this with the text search created by Rendition Filters

/**
 * Returns a filter schema that can be used to search for cards based on the given
 * schema and search term.
 *
 * @param {Object} schema - the type card's schema. This will define searchable fields.
 * @param {String} term - the search term to search for
 * @param {Object} options - optional options
 * @param {Boolean} options.fullTextSearchFieldsOnly - (default: false) if set, a null object will
 * be returned if no fullTextSearch fields are found.
 * @param {Boolean} options.includeIdAndSlug - (default: false) if set, the id and slug fields are
 * automatically included (as regexp searches)
 *
 * @returns {Object | null} - the filter schema, or null if no fullTextSearch fields are found
 * and fullTextSearchFieldsOnly is true.
 */
export const createFullTextSearchFilter = (
	schema: JsonSchema,
	term: string,
	options: {
		fullTextSearchFieldsOnly?: boolean;
		includeIdAndSlug?: boolean;
	} = {},
): JsonSchema | null => {
	let hasFullTextSearchField = false;
	const flatSchema = SchemaSieve.flattenSchema(schema as any);
	let stringKeys = flatSchema
		? _.reduce(
				flatSchema.properties,
				(
					carry: Array<{ key: keyof typeof flatSchema; item: JsonSchema }>,
					subSchema: JsonSchema,
					key: any,
				) => {
					const items: JsonSchema[] = [];
					if (
						typeof subSchema === 'object' &&
						(subSchema.oneOf || subSchema.anyOf)
					) {
						for (const value of (subSchema.oneOf || subSchema.anyOf)!) {
							items.push({
								type: subSchema.type,
								...(typeof value === 'object' ? value : {}),
							});
						}
					} else {
						items.push(subSchema);
					}
					for (const item of items) {
						if (isStringItem(item) || isArrayOfStringsItem(item)) {
							hasFullTextSearchField =
								hasFullTextSearchField ||
								(typeof item === 'object' && Boolean(item.fullTextSearch));
							carry.push({
								key,
								item,
							});
						}
					}
					return carry;
				},
				[],
		  )
		: [];

	// If any fullTextSearch field is found, we will only search these fields,
	// otherwise we'll fall-back to searching all regexp fields.
	if (hasFullTextSearchField) {
		stringKeys = _.filter(stringKeys, 'item.fullTextSearch');
	} else if (options.fullTextSearchFieldsOnly && !options.includeIdAndSlug) {
		return null;
	}

	const filter = {
		type: 'object',
		additionalProperties: true,
		description: `Any field contains ${term}`,
		anyOf: stringKeys.map(({ key, item }) => {
			return {
				type: 'object',
				properties: {
					[key]: getSearchableFieldQuerySchema(item, term),
				},
				required: [key],
			};
		}),
	} as JsonSchema;

	if (options.includeIdAndSlug) {
		const key = isUUID(term) ? 'id' : 'slug';
		// Only add this option if it is not already present
		if (
			typeof filter === 'object' &&
			!_.find(filter.anyOf, (anyOfOption) => {
				return _.has(anyOfOption, ['properties', key]);
			})
		) {
			filter.anyOf!.push({
				type: 'object',
				properties: {
					[key]: {
						// Note: we are not interested in matching against partial IDs or slugs
						const: term,
					},
				},
				required: [key],
			});
		}
	}

	return SchemaSieve.unflattenSchema(filter as any);
};

export const removeUndefinedArrayItems = (input: any): any => {
	if (_.isArray(input)) {
		return input.filter(_.negate(_.isUndefined));
	}
	if (_.isPlainObject(input)) {
		return _.mapValues(input, removeUndefinedArrayItems);
	}
	return input;
};

export const colorHash = _.memoize((input) => {
	return new ColorHash().hex(input);
});

/**
 * @summary convert any string to a integer between 0 and a chosen maximum.
 *
 * @param {String} string - input string
 * @param {Integer} max - limit the number to this maximum
 *
 * @returns {Integer} number between 0 and maximum
 */
export const stringToNumber = function (input: string, max: number) {
	let hash = 0;
	for (let index = 0; index < input.length; index++) {
		// tslint:disable-next-line:no-bitwise
		hash = input.charCodeAt(index) + ((hash << 5) - hash);
	}

	// tslint:disable-next-line:no-bitwise
	return (hash >> (input.length * 8)) & max;
};

// Get the actor from the create event if it is available, otherwise use the
// first message creator
export const getCreator = async (
	getActorFn: (actor: string) => Promise<UIActor | null>,
	card: Contract,
) => {
	const timeline = _.sortBy(
		_.get(card.links, ['has attached element'], []),
		'data.timestamp',
	);
	let createCard =
		_.find(timeline, {
			type: 'create@1.0.0',
		}) ||
		_.find(timeline, {
			type: 'create',
		});
	if (!createCard) {
		createCard =
			_.find(timeline, {
				type: 'message@1.0.0',
			}) ||
			_.find(timeline, {
				type: 'message',
			});
	}
	if (!createCard) {
		return null;
	}
	return getActorFn(_.get(createCard, ['data', 'actor']) as string);
};

export const getCreateCard = (card: Contract): Contract | undefined => {
	const attachedCards = _.get(card.links, ['has attached element'], []);
	return _.find(attachedCards, (attachedCard) => {
		return attachedCard.type.split('@')[0] === 'create';
	});
};

export const getLastUpdate = (card: Contract) => {
	const sorted = _.sortBy(
		_.get(card.links, ['has attached element'], []),
		'data.timestamp',
	);
	return _.last(sorted);
};

export const patchPath = (
	card: Contract,
	keyPath: _.PropertyPath,
	value: any,
) => {
	const patch = jsonpatch.compare(card, _.set(clone(card), keyPath, value));

	return patch;
};

/**
 * Returns a dictionary of user status options, keyed by
 * the user status value. For example:
 * {
 *   DoNotDisturb: {
 *     title: 'Do Not Disturb',
 *     value: 'DoNotDisturb'
 *   },
 *   {
 *     ...
 *   }
 * }
 */
export const getUserStatuses = _.memoize((userType) => {
	const userStatusOptionsList = _.get(
		userType,
		['data', 'schema', 'properties', 'data', 'properties', 'status', 'oneOf'],
		[],
	);
	return _.reduce(
		userStatusOptionsList,
		(opts: any, opt) => {
			if (_.has(opt, ['properties', 'value', 'const'])) {
				opts[opt.properties.value.const] = {
					title: opt.properties.title.const,
					value: opt.properties.value.const,
				};
			}
			return opts;
		},
		{},
	);
});

export const getMessage = (card: Contract): string => {
	return _.get(card, ['data', 'payload', 'message'], '');
};

export const getActorIdFromCard = _.memoize(
	(card) => {
		let actorId = _.get(card, ['data', 'actor']);
		if (!actorId) {
			const createCard = _.find(
				_.get(card, ['links', 'has attached element']),
				(linkedCard) => {
					return ['create', 'create@1.0.0'].includes(linkedCard.type);
				},
			);
			actorId = _.get(createCard, ['data', 'actor']);
		}
		return actorId;
	},
	(card) => {
		return card.id;
	},
);

export const generateActorFromUserCard = (
	card: UserContract,
): UIActor | null => {
	if (!card) {
		return null;
	}

	/* Get user name to display with priorities:
	 * 1. profile.name
	 * 2. card name or slug substring if user is balena org member
	 * 3. [card name or handle]
	 * 4. [email(s)]
	 * 5. [card slug substring]
	 */
	const profileName = _.get(card, ['data', 'profile', 'name']);
	const email = _.get(card, ['data', 'email'], '');

	const isBalenaOrgMember = _.find(_.get(card, ['links', 'is member of'], []), {
		slug: 'org-balena',
	});

	let name = 'unknown user';
	if (profileName && (profileName.first || profileName.last)) {
		name = _.compact([profileName.first, profileName.last]).join(' ');
	} else if (isBalenaOrgMember) {
		name = userDisplayName(card);
	} else {
		let handle = card.name || _.get(card, ['data', 'handle']);
		if (!handle) {
			if (email && email.length) {
				handle = _.isArray(email) ? email.join(', ') : email;
			} else {
				handle = card.slug.replace(/^(account|user)-/, '');
			}
		}
		name = `[${handle}]`;
	}

	return {
		name,
		email,
		avatarUrl: _.get(card, ['data', 'avatar']),

		// IF proxy is true, it indicates that the actor has been created as a proxy
		// for a real user in JF, usually as a result of syncing from an external
		// service
		proxy: !isBalenaOrgMember,
		card,
	};
};

export const username = (slug: string) => {
	if (!slug) {
		return 'Unknown user';
	}
	return slug.replace(/^user-/, '');
};

export const getUserTooltipText = (
	user: UserContract,
	options: {
		hideName?: boolean;
		hideEmail?: boolean;
		hideUsername?: boolean;
	} = {},
) => {
	const slug = _.get(user, ['slug'], '');
	const firstName = _.get(user, ['data', 'profile', 'name', 'first'], '');
	const lastName = _.get(user, ['data', 'profile', 'name', 'last'], '');
	const fullName = `${firstName} ${lastName}`.trim();
	const email = _.first(_.castArray(_.get(user, ['data', 'email']))) || '';
	return _.compact([
		options.hideName ? null : _.truncate(fullName, { length: 30 }),
		options.hideEmail ? null : _.truncate(email, { length: 30 }),
		options.hideUsername ? null : _.truncate(slug.slice(5), { length: 30 }),
	]).join('\n');
};

export const swallowEvent = (event: Event) => {
	event.preventDefault();
	event.stopPropagation();
};

export const getRelationshipTargetType = _.memoize((relationship) => {
	const type =
		_.get(relationship, ['type']) || _.get(relationship, ['query', 0, 'type']);
	return type && type.split('@')[0];
});

export const getType = _.memoize((typeSlug, types) => {
	return _.find(types, {
		slug: typeSlug.split('@')[0],
	});
});

export const userDisplayName = (user: UserContract) => {
	return user.name || username(user.slug);
};

// Matches all multi-line and inline code blocks
const CODE_BLOCK_REGEXP = /`{1,3}[^`]*`{1,3}/g;

export const getMessageMetaData = (message: string) => {
	const sanitizedMessage = message.replace(CODE_BLOCK_REGEXP, '');
	return {
		mentionsUser: getSlugsByPrefix('@', sanitizedMessage, 'user-'),
		alertsUser: getSlugsByPrefix('!', sanitizedMessage, 'user-'),
		mentionsGroup: getSlugsByPrefix('@@', sanitizedMessage),
		alertsGroup: getSlugsByPrefix('!!', sanitizedMessage),
		tags: findWordsByPrefix('#', sanitizedMessage).map((tag) => {
			return tag.slice(1).toLowerCase();
		}),
	};
};

export const px = (val: string | number): string => {
	return typeof val === 'number' ? `${val}px` : val;
};

export const isiOS = () => {
	// If we don't have a window or navigator object, we just assume Android
	// TODO: Refactor unit test setup code to import browser-env prior to any other code
	//       - this will allow us to ensure that window and navigator are always set - and
	//        set them to whatever we want to test (e.g. test iOS behavior as well!)
	if (typeof window !== 'object' || typeof navigator !== 'object') {
		return false;
	}
	return new DetectUA().isiOS;
};

/**
 * @summary determines whether the schema of a field matches any of the omitted values
 * @param {{object}} schema - the schema for the field of a card in jellyfish
 * @param {{string}} fieldName - name of the field we are checking againt
 * @param {{array}} omissions - a list containing schemas of fields
 * to ommit from the returned paths (e.g fields with the key 'format' and the value 'markdown')
 * @function
 * @returns {(Boolean)} whether it should be omitted or not
 * @example
 * const fieldShouldBeOmitted= checkFieldAgainstOmissions({ format: 'markdown', [{ key: 'format', value: 'markdown' }]})
 */
export const checkFieldAgainstOmissions = (
	schema: JsonSchema,
	fieldName: string,
	omissions: Array<{
		key: keyof JsonSchema;
		value: string;
		field: string;
	}>,
) => {
	const schemaValues = _.values(schema);
	return _.some(omissions, ({ key, value, field }) => {
		const matchesOmittedField = field && fieldName === field;
		if (matchesOmittedField) {
			return true;
		}
		const matchesOmittedKey = key && !_.isNil(schema[key]);
		const matchesOmittedValue = value && _.includes(schemaValues, value);

		if (key && value) {
			return matchesOmittedKey && matchesOmittedValue;
		}
		return matchesOmittedKey || matchesOmittedValue;
	});
};

/**
 * @summary recursively gets the path and title of all the fields defined in the type schema
 * @param {{object}} schema - the schema for a card in jellyfish
 * @param {{array}} omissions - a list containing schemas of fields
 * to ommit from the returned paths (e.g fields with the key 'format' and the value 'markdown')
 * @param {{array}} pathToField - a list of keys which describe the path to a particular field (e.g [ 'data', 'profile', 'firstname'])
 * @function
 * @returns {(Array)} a list of field paths and titles
 * @example
 * const fieldpaths = getPathsInSchema(schema)
 */
export const getPathsInSchema = (
	schema: any,
	omissions: Array<{
		key: keyof JsonSchema;
		value: string;
		field: string;
	}>,
	pathToField: string[] = [],
): any => {
	let newSchema: Array<{ path: string[]; title: string }> = [];
	const topLevelFields = _.keys(schema.properties);
	for (const field of topLevelFields) {
		const fieldSchema = schema.properties![field];
		const updatedPathToField = _.concat(pathToField, field);
		if (fieldSchema.type === 'object') {
			newSchema = _.concat(
				newSchema,
				getPathsInSchema(fieldSchema, omissions, updatedPathToField),
			);
		} else {
			const matchesAnOmission = checkFieldAgainstOmissions(
				fieldSchema,
				field,
				omissions,
			);
			if (!matchesAnOmission) {
				newSchema.push({
					path: updatedPathToField,
					title: fieldSchema.title || field,
				});
			}
		}
	}

	// Sort by path length to get top-level fields first
	return _.sortBy(newSchema, ({ path: fieldPath }) => {
		return fieldPath.length;
	});
};

export const generateJSONPatchDescription = (
	payload: JSONPatch[],
): string[] => {
	const items: string[] = [];
	for (const patch of payload) {
		switch (patch.op) {
			case 'add':
				items.push(`added value to path "${patch.path}"`);
				break;
			case 'remove':
				items.push(`removed path "${patch.path}"`);
				break;
			case 'replace':
				items.push(`changed value at path "${patch.path}"`);
				break;
			default:
				items.push(`path "${patch.path}" was modified`);
		}
	}

	return items;
};

export const getLinkedCardInfo = (link: LinkContract, card: Contract) => {
	const fromCard = _.get(link, ['data', 'from']);
	const toCard = _.get(link, ['data', 'to']);
	return toCard.id === card.id ? fromCard : toCard;
};

export const formatCardType = (type: string) => {
	const baseType = type.split('@')[0];
	const withoutDash = baseType.replace('-', ' ');
	return _.startCase(withoutDash);
};

export const formatCreatedAt = (card: Contract<{ timestamp: number }>) => {
	const timestamp = _.get(card, ['data', 'timestamp']) || card.created_at;
	return formatTimestamp(timestamp, true);
};

// Example matches:
// https://<host>/some-value
// http://<host>/some-value
// https://www.<host>/some-value

const jellyfishUrlRegex = new RegExp(
	`^https?://(www.)?${window.location.host}`,
);

export const isRelativeUrl = (url: string) => {
	return /^\/{1}(?!\/)/.test(url);
};

export const isLocalUrl = (url: string) => {
	return jellyfishUrlRegex.test(url);
};

export const toRelativeUrl = (absoluteUrl: string) => {
	const url = new URL(absoluteUrl);
	return `${url.pathname}${url.search}`;
};

export const getTypeBase = (type: string) => {
	return type.split('@')[0];
};

export const isTimelineEvent = (type: string) => {
	const typeBase = getTypeBase(type);
	return _.includes([MESSAGE, WHISPER, SUMMARY, RATING], typeBase);
};

export const isPrivateTimelineEvent = (type: string) => {
	const typeBase = getTypeBase(type);
	return _.includes([WHISPER, SUMMARY, RATING], typeBase);
};

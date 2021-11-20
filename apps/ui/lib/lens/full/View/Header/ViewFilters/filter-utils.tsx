import type { JSONSchema } from '@balena/jellyfish-types';
import skhema from 'skhema';
import _ from 'lodash';
import { FilterFieldOption } from 'rendition/dist/components/Filters/FilterModal';

export const LINKED_CONTRACT_PREFIX = '🔗';
const DELIMITER = '___';
const DELIMITER_PREFIX_REGEXP = new RegExp(`^${DELIMITER}`);

// A comparer function for filter field options that ensures linked contract field options
// appear _after_ those fields relating to the target contract type itself.
export const compareFilterFields = (
	a: FilterFieldOption,
	b: FilterFieldOption,
): number => {
	const aIsLink = a.title.startsWith(LINKED_CONTRACT_PREFIX);
	const bIsLink = b.title.startsWith(LINKED_CONTRACT_PREFIX);
	if (aIsLink === bIsLink) {
		return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
	} else if (aIsLink) {
		return 1;
	}
	return -1;
};

// getLinkedContractDataFilterKey and unpackLinksSchema are a pair of functions used to encode/decode linked contract data.
// The important thing here is that both the link verb and the contract type (or types) need to be encoded
// in the filter key. The Filters component will 'unflatten' this key when calling back with updated filters.
// We then need to dig through the unpacked pseudo schema to extract the link verb and type(s) and then construct
// our query object!

export const getLinkedContractDataFilterKey = (
	linkVerb: string,
	type: string | string[],
	keyPath: string,
): string => {
	if (!keyPath.startsWith(DELIMITER)) {
		throw new Error(
			`getLinkedContractDataFilterKey: keyPath must start with '${DELIMITER}'`,
		);
	}
	const types = _.castArray(type);
	if (!_.every(types, (t) => t.includes('@'))) {
		throw new Error(`getLinkedContractDataFilterKey: types must be versioned`);
	}
	return _.join(
		[
			'',
			'$$links',
			linkVerb,
			types.join(','),
			keyPath.replace(DELIMITER_PREFIX_REGEXP, ''),
		],
		DELIMITER,
	);
};

export const unpackLinksSchema = (
	pseudoLinksSchema: JSONSchema,
): {
	[key: string]: JSONSchema;
} => {
	// The link verb is presented as a property on the schema
	const linkVerb = _.get(pseudoLinksSchema, ['required', 0]);

	// The type(s) have been embedded as a property. Types are versioned and comma-separated.
	const toTypes = _.get(pseudoLinksSchema, [
		'properties',
		linkVerb,
		'required',
		0,
	]).split(',');
	// If there were multiple types specified, use an enum query matcher; otherwise const.
	const typeMatcher: JSONSchema =
		toTypes.length > 1
			? {
					type: 'string',
					enum: toTypes,
			  }
			: {
					type: 'string',
					const: toTypes[0],
			  };
	const typeSchema: JSONSchema = {
		type: 'object',
		required: ['type'],
		properties: {
			type: typeMatcher,
		},
	};

	// Drill down through the pseudo unflattened schema to get to the actual schema!
	const linkedContractSchema = _.get(pseudoLinksSchema, [
		'properties',
		linkVerb,
		'properties',
		toTypes,
	]);

	return {
		[linkVerb]: skhema.merge([linkedContractSchema, typeSchema]) as JSONSchema,
	};
};

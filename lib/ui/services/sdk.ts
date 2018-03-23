import axios from 'axios';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';

const API_PREFIX = '/api/v1/';
const API_URL = 'http://localhost:8000';

const flatten = (input: any, path: any[] = [], flattened: any[] = []) => {
	// Add path and value to flat array
	if ([Boolean, Number, String].indexOf(input.constructor) !== -1) {
		const serializedPath = path.map(
			(key, index) => index ? `[${key}]` : key,
		).join('');
		// String values are escaped with an additional set of quotes.
		const escapedInput = typeof input === 'string' ? `'${input}'` : input;
		flattened.push([serializedPath, escapedInput]);
	} else if ([Array, Object].indexOf(input.constructor) !== -1) {
		// Iterate over next level of array/object
		_.forEach(input, (item: any, key: string) => {
			flattened = flatten(item, path.concat([key]), flattened);
		});
	}

	return flattened;
};

// We use bracket notation to serialize query string params, so that we can
// support nested objects
const queryStringEncode = (input: any) => {
	// Array of path/value tuples
	const flattened = flatten(input);

	// Convert array to query string
	return flattened.map((pair: any[]) =>
		pair.map(encodeURIComponent).join('='),
	).join('&');
};

export const get = (schema: JSONSchema6) =>
	axios.get(`${API_URL}${API_PREFIX}query?${queryStringEncode(schema)}`, {
//		params: { schema: queryStringEncode(schema) },
	})
	.then(response => response.data);

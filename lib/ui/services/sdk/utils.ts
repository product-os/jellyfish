import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { API_PREFIX, API_URL } from './constants';
import store from '../store';

import Ajv = require('ajv');
import ajvKeywords = require('ajv-keywords');
import metaSchema6 = require('ajv/lib/refs/json-schema-draft-06.json');

const ajv = new Ajv();
ajvKeywords(ajv);
ajv.addMetaSchema(metaSchema6);


const trimSlash = (s: string) => _.trim(s, '/');

const API_BASE = `${trimSlash(API_URL)}/${trimSlash(API_PREFIX)}/`;

export const getToken = () => _.get(store.getState(), 'session.authToken');

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
export const queryStringEncode = (input: any) => {
	if (_.isString(input)) {
		return `query=${input}`;
	}
	// Array of path/value tuples
	const flattened = flatten(input);

	// Convert array to query string
	return flattened.map((pair: any[]) =>
		pair.map(encodeURIComponent).join('='),
	).join('&');
};

/**
 * @summary Check if a string is a UUID
 * @function
 * @public
 *
 * @param {String} string - string
 * @returns {Boolean} whether the string is a uuid
 *
 * @example
 * if (utils.isUUID('4a962ad9-20b5-4dd8-a707-bf819593cc84')) {
 *   console.log('This is a uuid')
 * }
 */
export const isUUID = (text: string) => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text);
};

const withAuth = (options?: AxiosRequestConfig) => {
	const token = getToken();
	if (!token) {
		return options;
	}

	return _.merge(
		{},
		options,
		{
			headers: {
				authorization: `Bearer ${token}`,
			},
		},
	);
};

const handleError = (e: AxiosError) => {
	if (e.response && e.response.data) {
		throw new Error(e.response.data.data);
	}
	throw e;
};

interface ServerResponse {
	error: boolean;
	data: any;
}

export const getRequest = <R = ServerResponse>(endpoint: string, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.get<R>(`${API_BASE}${endpoint}`, withAuth(options) 	))
		.catch(handleError);

export const postRequest = <R = ServerResponse>(endpoint: string, body: any, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.post<R>(`${API_BASE}${endpoint}`, body, withAuth(options)))
		.catch(handleError);

export const slugify = (text: string) => text.toLowerCase()
	.replace(/\s+/g, '-')
	.replace(/[^0-9a-z-]/g, '');

export const compileSchema = (schema: JSONSchema6) => ajv.compile(schema);

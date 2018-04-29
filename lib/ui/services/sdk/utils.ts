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

export const postRequest = <R = ServerResponse>(endpoint: string, body: any, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.post<R>(`${API_BASE}${trimSlash(endpoint)}`, body, withAuth(options)))
		.catch(handleError);

export const slugify = (text: string) => text.toLowerCase()
	.replace(/\s+/g, '-')
	.replace(/[^0-9a-z-]/g, '');

export const compileSchema = (schema: JSONSchema6) => ajv.compile(schema);

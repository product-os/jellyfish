import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../Types';

import Ajv = require('ajv');
import ajvKeywords = require('ajv-keywords');
import metaSchema6 = require('ajv/lib/refs/json-schema-draft-06.json');

const ajv = new Ajv();
ajv.addMetaSchema(metaSchema6);
ajvKeywords(ajv, [
	'formatMaximum',
	'formatMinimum',
]);

const ORANGE = '#F54828';

const DEBUG =	!_.includes([
	'test',
], process.env.NODE_ENV);

export const debug = (...params: any[]) => {
	if (DEBUG) {
		console.log('%cjellyfish:sdk', `color: ${ORANGE};`, ...params);
	}
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

export const slugify = (text: string) => text.toLowerCase()
	.replace(/\s+/g, '-')
	.replace(/[^0-9a-z-]/g, '');

export const compileSchema = (schema: JSONSchema6) => ajv.compile(schema);

export interface ActionResponse {
	error: boolean;
	data: {
		id: string;
		results: {
			data: any;
			error: boolean;
			timestamp: string;
		};
	};
}

export interface ServerResponse {
	error: boolean;
	data: any;
}

export interface SDKInterface {
	getAuthToken: () => string | undefined;
	setAuthToken: (token: string) => void;

	action: <D>(body: {
		target: string;
		action: string;
		arguments?: any;
		transient?: any;
	}) => Promise<D>;
	query: <T = Card>(schema: JSONSchema6 | string) => Promise<T[]>;

	post: <R = ServerResponse>(endpoint: string, body: any, options?: AxiosRequestConfig) => Promise<AxiosResponse<R>>;

	card: {
		get: (idOrSlug: string) => Promise<Card | null>;
	};
}

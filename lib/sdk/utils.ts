/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

/**
 * @summary Print a debug message to the console
 * @name debug
 * @public
 * @function
 * @memberof jellyfishSdk.utils
 *
 * @description Stream updates and insertions for cards that match a JSON
 * schema
 *
 * @param {*} params - The data to print to the console
 *
 * @example
 * debug('foo bar baz')
 */
export const debug = (...params: any[]) => {
	if (DEBUG) {
		console.log('%cjellyfish:sdk', `color: ${ORANGE};`, ...params);
	}
};

/**
 * @summary Check if a string is a UUID
 * @name isUUID
 * @function
 * @public
 * @memberof jellyfishSdk.utils
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

/**
 * @summary Convert a string into a value that can be used as a slug
 * @name slugify
 * @function
 * @public
 * @memberof jellyfishSdk.utils
 *
 * @description Lowercases text, then converts spaces to hyphens and removes any character that isn't
 * alphanumeric or a dash
 *
 * @param {String} string - string
 * @returns {String} A valid slug
 *
 * @example
 * const slug = utils.slugify('Lorem ipsum!')
 * console.log(slug) //--> 'lorem-ipsum'
 */
export const slugify = (text: string) => text.toLowerCase()
	.replace(/\s+/g, '-')
	.replace(/[^0-9a-z-]/g, '');

/**
 * @summary Compile a schema using AJV
 * @name compileSchema
 * @function
 * @public
 * @memberof jellyfishSdk.utils
 *
 * @description Compiles a schema using AJV, return a validator function
 * @see https://github.com/epoberezkin/ajv#compileobject-schema---functionobject-data
 *
 * @param {Object} schema - A JSON schema
 * @returns {Function} An ajv validator function
 *
 * @example
 * const schema = {
 * 	type: 'object',
 * 	properies: {
 * 		type: {
 * 			const: 'thread'
 * 		}
 * 	}
 * };
 *
 * const validator = utils.compileSchema(schema);
 */
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
	getApiUrl: () => string | undefined;
	getAuthToken: () => string | undefined;
	setAuthToken: (token: string) => void;
	clearAuthToken: () => void;

	cancelAllRequests: (reason?: string) => void;
	cancelAllStreams: () => void;

	action: <D>(body: {
		target: string;
		action: string;
		arguments?: any;
		transient?: any;
	}) => Promise<D>;
	query: <T extends Card>(schema: JSONSchema6) => Promise<T[]>;

	post: <R = ServerResponse>(endpoint: string, body: any, options?: AxiosRequestConfig) => Promise<AxiosResponse<R> | void>;

	card: {
		get: (idOrSlug: string) => Promise<Card | null>;
	};
}

export interface StreamEventMap {
	update: {
		id: string,
		error: false;
		data: {
			after: Card;
			before: Card | null;
		};
	};

	streamError: {
		id: string,
		error: true;
		data: string;
	};

	destroy: void;
}

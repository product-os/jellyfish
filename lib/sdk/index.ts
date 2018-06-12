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

import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../Types';
import { AuthSdk } from './auth';
import { CardSdk } from './card';
import { JellyfishStreamManager } from './stream';
import * as utils from './utils';

interface SdkOptions {
	apiUrl: string;
	apiPrefix: string;
	authToken?: string;
}

const trimSlash = (s: string) => _.trim(s, '/');

/**
 * @namespace jellyfishSdk
 */
export class Sdk implements utils.SDKInterface {
	/**
	 * @namespace auth
	 * @memberOf jellyfishSdk
	 */
	public auth: AuthSdk;

	/**
	 * @namespace card
	 * @memberOf jellyfishSdk
	 */
	public card: CardSdk;

	/**
	 * @namespace utils
	 * @memberOf jellyfishSdk
	 */
	public utils: typeof utils;

	private cancelTokenSource: CancelTokenSource;
	private streamManager: JellyfishStreamManager;

	private API_BASE: string;

	constructor(
		private API_URL: string,
		private API_PREFIX: string,
		private authToken?: string,
	) {
		this.auth = new AuthSdk(this);
		this.card = new CardSdk(this);

		this.utils = utils;

		this.cancelTokenSource = axios.CancelToken.source();

		this.setApiBase(API_URL, API_PREFIX);

		this.streamManager = new JellyfishStreamManager(this);

	}

	/**
	 * @summary Set the API url
	 * @name setApiUrl
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Set the url of the Jellyfish API instance the SDK should
	 * communicate with
	 *
	 * @param {String} apiUrl - The API url
	 *
	 * @example
	 * jellyfishSdk.setApiUrl('http://localhost:8000')
	 */
	public setApiUrl(apiUrl: string) {
		this.API_URL = apiUrl;
		this.setApiBase(this.API_URL, this.API_PREFIX);
	}

	/**
	 * @summary Get the API url
	 * @name getApiUrl
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Get the url of the Jellyfish API instance the SDK should
	 * communicate with
	 *
	 * @returns {String|undefined} The API url
	 *
	 * @example
	 * const url = jellyfishSdk.getApiUrl()
	 * console.log(url) //--> 'http://localhost:8000'
	 */
	public getApiUrl() {
		return this.API_URL;
	}

	/**
	 * @summary Set the base API url
	 * @name setApiBase
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Set the url and path prefix to use when sending requests to
	 * the API
	 *
	 * @param {String} apiUrl - The API url
	 * @param {String} apiPrefix - The API path prefix
	 *
	 * @example
	 * jellyfishSdk.setApiBase('http://localhost:8000', 'api/v1')
	 */
	public setApiBase(apiUrl: string, apiPrefix: string) {
		this.API_BASE = `${trimSlash(apiUrl)}/${trimSlash(apiPrefix)}/`;
	}

	/**
	 * @summary Set the auth token
	 * @name setAauthToken
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Set authentication token used when sending request to the API
	 *
	 * @param {String} token - The authentication token
	 *
	 * @example
	 * jellyfishSdk.setAuthToken('799de256-31bb-4399-b2d2-3c2a2483ddd8')
	 */
	public setAuthToken(token: string) {
		this.authToken = token;
	}

	/**
	 * @summary Get the auth token
	 * @name getAauthToken
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Get authentication token used when sending request to the API
	 *
	 * @returns {String|undefined} The authentication token if it has been set
	 *
	 * @example
	 * const token = jellyfishSdk.getAuthToken(
	 * console.log(token) //--> '799de256-31bb-4399-b2d2-3c2a2483ddd8'
	 */
	public getAuthToken() {
		return this.authToken;
	}

	/**
	 * @summary clear the auth token
	 * @name clearAuthToken
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Clear the authentication token used when sending request to the API
	 *
	 * @example
	 * jellyfishSdk.clearAuthToken()
	 */
	public clearAuthToken() {
		this.authToken = undefined;
	}

	/**
	 * @summary Cancel all network requests
	 * @name cancelAllRequests
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Cancel all network requests that are currently in progress,
	 * optionally providing a reason for doing so.
	 *
	 * @param {String} [reason='Operation canceled by user'] - The reason for
	 * cancelling the network requests
	 *
	 * @example
	 * jellyfishSdk.cancelAllRequests()
	 */
	public cancelAllRequests(reason: string = 'Operation canceled by user') {
		this.cancelTokenSource.cancel(reason);
		// Regenerate the cancel token
		this.cancelTokenSource = axios.CancelToken.source();
	}

	/**
	 * @summary Cancel all streams
	 * @name cancelAllstreams
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Close all open streams to the Jellyfish API
	 *
	 * @example
	 * jellyfishSdk.cancelAllStreams()
	 */
	public cancelAllStreams() {
		this.streamManager.close();
	}

	/**
	 * @summary Send a POST request to the API
	 * @name post
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Send a POST request to the Jellyfish API. Uses Axios under the
	 * hood. Requests are automatically authorized using a token if it has
	 * been set.
	 *
	 * @param {String} endpoint - The endpoint to send the POST request to
	 * @param {Object} body - The body data to send
	 * @param {Object} [options] - Request configuration options. See https://github.com/axios/axios#request-config
	 *
	 * @fulfil {Object} - Request response object
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.post('action', { foo: 'bar'})
	 * 	.then((data) => {
	 * 		console.log(data);
	 * 	});
	 */
	public post <R = utils.ServerResponse>(endpoint: string, body: any, options?: AxiosRequestConfig) {
		const requestOptions = this.authToken ?
			_.merge(
				{},
				options,
				{
					headers: {
						authorization: `Bearer ${this.authToken}`,
					},
					cancelToken: this.cancelTokenSource.token,
				},
			) :
			options;

		return Bluebird.try(() => axios.post<R>(
			`${this.API_BASE}${trimSlash(endpoint)}`,
			body,
			requestOptions,
		))
			.catch((e) => {
				if (e.message === 'Operation canceled by user') {
					console.log('Caught Axios cancel error and ignoring it');
					return;
				}
				if (e.response && e.response.data) {
					throw new Error(e.response.data.data);
				}
				throw e;
			});
	}

	/**
	 * @summary Load config object from the API
	 * @name getConfig
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Retrieve configuration data from the API
	 *
	 * @fulfil {Object} - Config object
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.getConfig()
	 * 	.then((config) => {
	 * 		console.log(config);
	 * 	});
	 */
	public getConfig = () => {
		return Bluebird.try(() => axios.get<string>(`${this.API_BASE}config`))
		.then((response) => response.data);
	}

	/**
	 * @summary Send a query request to the API
	 * @name query
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Query the API for card data, using a JSON schema. Cards that
	 * match the JSON schema are returned
	 *
	 * @param {Object} schema - The JSON schema to query with
	 *
	 * @fulfil {Object[]} - An array of cards that match the schema
	 * @returns {Promise}
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
	 * jellyfishSdk.query(schema)
	 * 	.then((cards) => {
	 * 		console.log(cards);
	 * 	});
	 */
	public query <T extends Card>(schema: JSONSchema6): Bluebird<T[]> {
		const start = Date.now();
		return this.post('query', _.isString(schema) ? { query: schema } : schema)
			.then(response => response ? response.data.data : [])
			.tap(() => {
				utils.debug(`Query complete in ${Date.now() - start}ms`, schema);
			});
	}

	/**
	 * @typedef {Object} ActionResponse
	 * @property {Boolean} error - True if an error occurred, false otherwise
	 * @property {Object} data - The response payload
	 * @property {String} data.id - The id of the action request
	 * @property {Object} data.results - The results of running the action request
	 * @property {*} data.results.data - The end response produced by the action request
	 * @property {Boolean} data.results.error - True if the action request
	 *           encountered an error, false otherwise
	 * @property {String} data.results.timestamp - A timestamp of when the action
	 *           request was processed
	 */

	/**
	 * @summary Send an action to the API
	 * @name action
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Send an action to the API, the request will resolve
	 * once the action is complete
	 *
	 * @param {Object} body - The action request
	 * @param {String} body.target - The slug or UUID of the target card
	 * @param {String} body.action - The name of the action to run
	 * @param {*} [body.arguments] - The arguments to use when running the
	 * action
	 * @param {*} [body.transient] - The transient arguments to use when running the
	 * action
	 *
	 * @fulfil {ActionResponse} - An action response object
	 * @returns {Promise}
	 *
	 * @example
	 * jellyfishSdk.action({
	 * 	target: 'thread',
	 * 	action: 'action-create-card',
	 * 	arguments: {
	 * 		data: {
	 * 			description: 'lorem ipsum dolor sit amet'
	 * 		}
	 * 	}
	 * })
	 * 	.then((response) => {
	 * 		console.log(response);
	 * 	});
	 */
	public action(body: {
		target: string;
		action: string;
		arguments?: any;
		transient?: any;
	}) {
		const start = Date.now();

		utils.debug(`Dispatching action ${body.action}`, body);

		if (!body.arguments) {
			body.arguments = {};
		}

		return this.post<utils.ActionResponse>('action', body)
			.then((response) => {
				utils.debug(`Action ${body.action} complete in ${Date.now() - start}ms`);
				if  (!response) {
					return {};
				}

				const { results } = response.data.data;
				if (results.error) {
					throw new Error(results.data);
				}

				return results.data;
			});
	}

	/**
	 * @summary Stream cards from the API
	 * @name stream
	 * @public
	 * @function
	 * @memberof jellyfishSdk
	 *
	 * @description Stream updates and insertions for cards that match a JSON
	 * schema
	 *
	 * @param {Object} schema - The JSON schema to query with
	 *
	 * @returns {EventEmitter}
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
	 * const stream = jellyfishSdk.stream(schema)
	 *
	 * stream.on('update', (data) => {
	 * 	console.log(data);
	 * })
	 *
	 * stream.on('streamError', (error) => {
	 * 	console.error(error);
	 * })
	 */
	public stream(query: JSONSchema6) {
		return this.streamManager.stream(query);
	}
}

/**
 * @summary Initialize a new JellyfishSdk instance
 * @name jellyfishSdk
 * @public
 * @function
 *
 * @param {String} apiUrl - The api url to send requests to
 * @param {String} apiPrefix - The path prefix to use for API requests
 * @param {String} [authToken] - An auth token to use when making requests
 *
 * @returns {Ojbect} A new JellyfishSdk instance
 *
 * @example
 * const sdk = jellyfishSdk({
 * 	apiUrl: 'http://localhost:8000',
 * 	apiPrefix: 'api/v1',
 * 	authToken: '799de256-31bb-4399-b2d2-3c2a2483ddd8'
 * })
 */
export const jellyfishSdk = ({
	apiUrl,
	apiPrefix,
	authToken,
}: SdkOptions) => {
	return new Sdk(apiUrl, apiPrefix, authToken);
};

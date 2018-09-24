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

import axios, { AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';
import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { AuthSdk } from './auth';
import { CardSdk } from './card';
import { JellyfishStream, JellyfishStreamManager } from './stream';
import {
	ActionResponse,
	Card,
	SDKInterface,
	SDKOptions,
	ServerResponse
} from './Types';
import * as utils from './utils';

const trimSlash = (s: string) => _.trim(s, '/');

/**
 * @namespace JellyfishSDK
 */
export class JellyfishSDK implements SDKInterface {
	/**
	 * @namespace auth
	 * @memberOf JellyfishSDK
	 */
	public auth: AuthSdk;

	/**
	 * @namespace card
	 * @memberOf JellyfishSDK
	 */
	public card: CardSdk;

	/**
	 * @namespace utils
	 * @memberOf JellyfishSDK
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
	 * @memberof JellyfishSDK
	 *
	 * @description Set the url of the Jellyfish API instance the SDK should
	 * communicate with
	 *
	 * @param {String} apiUrl - The API url
	 *
	 * @example
	 * sdk.setApiUrl('http://localhost:8000')
	 */
	public setApiUrl(apiUrl: string): void {
		this.API_URL = apiUrl;
		this.setApiBase(this.API_URL, this.API_PREFIX);
	}

	/**
	 * @summary Get the API url
	 * @name getApiUrl
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Get the url of the Jellyfish API instance the SDK should
	 * communicate with
	 *
	 * @returns {String|undefined} The API url
	 *
	 * @example
	 * const url = sdk.getApiUrl()
	 * console.log(url) //--> 'http://localhost:8000'
	 */
	public getApiUrl(): string | undefined {
		return this.API_URL;
	}

	/**
	 * @summary Set the base API url
	 * @name setApiBase
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Set the url and path prefix to use when sending requests to
	 * the API
	 *
	 * @param {String} apiUrl - The API url
	 * @param {String} apiPrefix - The API path prefix
	 *
	 * @example
	 * sdk.setApiBase('http://localhost:8000', 'api/v2')
	 */
	public setApiBase(apiUrl: string, apiPrefix: string): void {
		this.API_BASE = `${trimSlash(apiUrl)}/${trimSlash(apiPrefix)}/`;
	}

	/**
	 * @summary Set the auth token
	 * @name setAauthToken
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Set authentication token used when sending request to the API
	 *
	 * @param {String} token - The authentication token
	 *
	 * @example
	 * sdk.setAuthToken('799de256-31bb-4399-b2d2-3c2a2483ddd8')
	 */
	public setAuthToken(token: string): void {
		this.authToken = token;
	}

	/**
	 * @summary Get the auth token
	 * @name getAauthToken
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Get authentication token used when sending request to the API
	 *
	 * @returns {String|undefined} The authentication token if it has been set
	 *
	 * @example
	 * const token = sdk.getAuthToken(
	 * console.log(token) //--> '799de256-31bb-4399-b2d2-3c2a2483ddd8'
	 */
	public getAuthToken(): string | undefined {
		return this.authToken;
	}

	/**
	 * @summary clear the auth token
	 * @name clearAuthToken
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Clear the authentication token used when sending request to the API
	 *
	 * @example
	 * sdk.clearAuthToken()
	 */
	public clearAuthToken(): void {
		this.authToken = undefined;
	}

	/**
	 * @summary Cancel all network requests
	 * @name cancelAllRequests
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Cancel all network requests that are currently in progress,
	 * optionally providing a reason for doing so.
	 *
	 * @param {String} [reason='Operation canceled by user'] - The reason for
	 * cancelling the network requests
	 *
	 * @example
	 * sdk.cancelAllRequests()
	 */
	public cancelAllRequests(reason: string = 'Operation canceled by user'): void {
		this.cancelTokenSource.cancel(reason);
		// Regenerate the cancel token
		this.cancelTokenSource = axios.CancelToken.source();
	}

	/**
	 * @summary Cancel all streams
	 * @name cancelAllstreams
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Close all open streams to the Jellyfish API
	 *
	 * @example
	 * sdk.cancelAllStreams()
	 */
	public cancelAllStreams(): void {
		this.streamManager.close();
	}

	/**
	 * @summary Send a POST request to the API
	 * @name post
	 * @public
	 * @function
	 * @memberof JellyfishSDK
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
	 * sdk.post('action', { foo: 'bar'})
	 * 	.then((data) => {
	 * 		console.log(data);
	 * 	});
	 */
	public post <R = ServerResponse>(
		endpoint: string,
		body: any,
		options?: AxiosRequestConfig,
	): Bluebird<void | AxiosResponse<R>> {
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
					const message = _.get(e.response.data, [ 'data', 'message' ], e.response.data.data);
					if (message) {
						throw new Error(message);
					}
				}
				throw e;
			});
	}

	/**
	 * @summary Load config object from the API
	 * @name getConfig
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Retrieve configuration data from the API
	 *
	 * @fulfil {Object} - Config object
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.getConfig()
	 * 	.then((config) => {
	 * 		console.log(config);
	 * 	});
	 */
	public getConfig = (): Bluebird<{ [k: string]: any }> => {
		return Bluebird.try(() => axios.get<{ [k: string]: any }>(`${this.API_BASE}config`))
		.then((response) => response.data);
	}

	/**
	 * @summary Send a query request to the API
	 * @name query
	 * @public
	 * @function
	 * @memberof JellyfishSDK
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
	 * sdk.query(schema)
	 * 	.then((cards) => {
	 * 		console.log(cards);
	 * 	});
	 */
	public query <T extends Card>(schema: JSONSchema6): Bluebird<T[]> {
		const start = Date.now();
		return this.post('query', _.isString(schema) ? { query: schema } : _.omit(schema, '$id'))
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
	 * @memberof JellyfishSDK
	 *
	 * @description Send an action to the API, the request will resolve
	 * once the action is complete
	 *
	 * @param {Object} body - The action request
	 * @param {String} body.card - The slug or UUID of the target card
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
	 * sdk.action({
	 * 	card: 'thread',
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
	public action<D = any>(body: {
		card: string;
		action: string;
		arguments?: any;
	}): Bluebird<any> {
		const start = Date.now();

		let payload: any = body;

		utils.debug(`Dispatching action ${body.action}`, body);

		if (!body.arguments) {
			body.arguments = {};
		}

		// Check if files are being posted, if they are we need to modify the
		// payload so that it gets sent as form data
		if (body.arguments.properties) {
			const extraction = utils.extractFiles(body.arguments.properties);
			// If file elements were found, change the payload to form data
			if (extraction.elements.length) {
				const formData = new FormData();
				extraction.elements.forEach((element) => {
					formData.append(element.path, element.file);
				});
				formData.append('action', JSON.stringify({
					card: body.card,
					action: body.action,
					arguments: {
						...body.arguments,
						properties: extraction.result,
					},
				}));

				payload = formData;
			}
		}

		return this.post<ActionResponse<D>>('action', payload)
			.then((response) => {
				utils.debug(`Action ${body.action} complete in ${Date.now() - start}ms`);
				if  (!response) {
					return {};
				}

				const { error, data } = response.data;

				if (error) {
					throw new Error(_.get(data, 'message'));
				}

				return data as D;
			});
	}

	/**
	 * @summary Retrieve a file form the API
	 * @name getFile
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Retrieve a file from the API
	 *
	 * @param {String} cardId - The id of the card this file is attached to
	 * @param {String} name - The name of the file
	 *
	 * @fulfil {File} - The requested file
	 * @returns {Promise}
	 */
	public getFile = (cardId: string, name: string) => {
		return Bluebird.try(() => {
			return axios.get<any>(`${this.API_BASE}file/${cardId}/${name}`, {
					headers: {
						authorization: `Bearer ${this.authToken}`,
						accept: 'image/webp,image/*,*/*;q=0.8',
					},
					responseType: 'arraybuffer',
			});
		})
		.then((response) => response.data);
	}

	/**
	 * @summary Stream cards from the API
	 * @name stream
	 * @public
	 * @function
	 * @memberof JellyfishSDK
	 *
	 * @description Stream updates and insertions for cards that match a JSON
	 * schema
	 *
	 * @param {Object} schema - The JSON schema to query with
	 *
	 * @fulfil {EventEmitter}
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
	 * const stream = sdk.stream(schema)
	 *
	 * stream.on('update', (data) => {
	 * 	console.log(data);
	 * })
	 *
	 * stream.on('streamError', (error) => {
	 * 	console.error(error);
	 * })
	 */
	public stream(query: JSONSchema6): Promise<JellyfishStream> {
		return this.streamManager.stream(query);
	}
}

/**
 * @summary Initialize a new JellyfishSdk instance
 * @name JellyfishSDK
 * @public
 * @function
 *
 * @param {String} apiUrl - The api url to send requests to
 * @param {String} apiPrefix - The path prefix to use for API requests
 * @param {String} [authToken] - An auth token to use when making requests
 *
 * @returns {Object} A new JellyfishSdk instance
 *
 * @example
 * const sdk = getSdk({
 * 	apiUrl: 'http://localhost:8000',
 * 	apiPrefix: 'api/v2',
 * 	authToken: '799de256-31bb-4399-b2d2-3c2a2483ddd8'
 * })
 */
export const getSdk = ({
	apiUrl,
	apiPrefix,
	authToken,
}: SDKOptions): JellyfishSDK => {
	return new JellyfishSDK(apiUrl, apiPrefix, authToken);
};

import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { concat, from, Observable, of } from 'rxjs';
import { Card } from '../Types';
import { AuthSdk } from './auth';
import { CardSdk } from './card';
import { MiniJelly } from './mini-jelly';
import { JellyfishStreamManager } from './stream';
import * as utils from './utils';

interface SdkOptions {
	apiUrl: string;
	apiPrefix: string;
	authToken?: string;
}

const trimSlash = (s: string) => _.trim(s, '/');

export class Sdk implements utils.SDKInterface {
	public auth: AuthSdk;
	public card: CardSdk;
	public miniJelly: MiniJelly;
	public utils: typeof utils;

	private cancelTokenSource: CancelTokenSource;
	private streamManager: JellyfishStreamManager;

	private API_BASE: string;

	constructor(
		private API_URL: string,
		private API_PREFIX: string,
		private authToken?: string,
	) {
		this.miniJelly = new MiniJelly();
		this.auth = new AuthSdk(this);
		this.card = new CardSdk(this);

		this.utils = utils;

		this.cancelTokenSource = axios.CancelToken.source();

		this.setApiBase(API_URL, API_PREFIX);

		this.streamManager = new JellyfishStreamManager(this);

	}

	public setApiUrl(apiUrl: string) {
		this.API_URL = apiUrl;
		this.setApiBase(this.API_URL, this.API_PREFIX);
	}

	public getApiUrl() {
		return this.API_URL;
	}

	public setApiPrefix(apiPrefix: string) {
		this.API_PREFIX = apiPrefix;
		this.setApiBase(this.API_URL, this.API_PREFIX);
	}

	public setApiBase(apiUrl: string, apiPrefix: string) {
		this.API_BASE = `${trimSlash(apiUrl)}/${trimSlash(apiPrefix)}/`;
	}

	public setAuthToken(token: string) {
		this.authToken = token;
	}

	public getAuthToken() {
		return this.authToken;
	}

	public clearAuthToken() {
		this.authToken = undefined;
	}

	public cancelAllRequests(reason: string = 'Operation canceled by user') {
		this.cancelTokenSource.cancel(reason);
		// Regenerate the cancel token
		this.cancelTokenSource = axios.CancelToken.source();
	}

	public cancelAllStreams() {
		this.streamManager.close();
	}

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

		return Promise.try(() => axios.post<R>(
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

	public getConfig = () => {
		return Promise.try(() => axios.get<string>(`${this.API_BASE}config`))
		.then((response) => response.data);
	}

	public query <T extends Card>(
		schema: JSONSchema6,
		options: utils.SDKQueryOptions = {},
	): Observable<T[]> {
		const start = Date.now();
		const backendRequest = this.post('query', _.isString(schema) ? { query: schema } : schema)
			.then(response => response.data.data)
			.tap(() => {
				utils.debug(`Query complete in ${Date.now() - start}ms`, schema);
			})
			.tap((cards) => {
				this.miniJelly.batchInsert(cards);
			});

		if (options.skipCache) {
			return from(backendRequest);
		}

		const localCards = this.miniJelly.query(schema);

		return concat(
			of(localCards),
			from(backendRequest),
		);
	}

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
				const { results } = response.data.data;
				if (results.error) {
					throw new Error(results.data);
				}

				return results.data;
			});
	}

	public stream(query: JSONSchema6, options?: utils.SDKQueryOptions) {
		return this.streamManager.stream(query, options);
	}
}

export const jellyfishSdk = ({
	apiUrl,
	apiPrefix,
	authToken,
}: SdkOptions) => {
	return new Sdk(apiUrl, apiPrefix, authToken);
};

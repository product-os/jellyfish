import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../Types';
import { AuthSdk } from './auth';
import { CardSdk } from './models/card';
import { SubscriptionSdk } from './models/subscription';
import { TypeSdk } from './models/type';
import { UserSdk } from './models/user';
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
	public subscription: SubscriptionSdk;
	public type: TypeSdk;
	public user: UserSdk;
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
		this.subscription = new SubscriptionSdk(this);
		this.type = new TypeSdk(this);
		this.user = new UserSdk(this);

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
		// Debugging data to help trace unhandled rejects caused by canceling AXIOS
		// requests. Only shown in a test env
		let trace: any;
		if (process.env.NODE_ENV === 'test') {
			trace = new Error().stack;
		}
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
				if (e.message === 'Operation canceled by user' && process.env.NODE_ENV === 'test') {
					console.log('AXIOS Cancel error');
					console.log('endpoint', endpoint);
					console.log('body', JSON.stringify(body, null, 4));
					console.log(trace!);
				}
				if (e.response && e.response.data) {
					throw new Error(e.response.data.data);
				}
				throw e;
			});
	}

	public query <T = Card>(schema: JSONSchema6 | string): Promise<T[]> {
		return this.post('query', _.isString(schema) ? { query: schema } : schema)
			.then(response => response.data.data);
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

	public stream(query: JSONSchema6 | string | Card) {
		return this.streamManager.stream(query);
	}
}

export const jellyfishSdk = ({
	apiUrl,
	apiPrefix,
	authToken,
}: SdkOptions) => {
	return new Sdk(apiUrl, apiPrefix, authToken);
};

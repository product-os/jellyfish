import axios, { AxiosRequestConfig } from 'axios';
import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card } from '../Types';
import { AuthSdk } from './auth';
import { CardSdk } from './card';
import { JellyfishStream } from './stream';
import { TypeSdk } from './type';
import { UserSdk } from './user';
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
	public type: TypeSdk;
	public user: UserSdk;
	public utils: typeof utils;

	private API_BASE: string;

	constructor(
		private API_URL: string,
		API_PREFIX: string,
		private authToken?: string,
	) {
		this.auth = new AuthSdk(this);
		this.card = new CardSdk(this);
		this.type = new TypeSdk(this);
		this.user = new UserSdk(this);

		this.utils = utils;

		this.API_BASE = `${trimSlash(API_URL)}/${trimSlash(API_PREFIX)}/`;
	}

	public setAuthToken(token: string) {
		this.authToken = token;
	}

	public getAuthToken() {
		return this.authToken;
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
				},
			) :
			options;

		return Promise.try(() => axios.post<R>(
			`${this.API_BASE}${trimSlash(endpoint)}`,
			body,
			requestOptions,
		))
			.catch((e) => {
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

	public action (body: {
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

		return Promise.try(() => {
			if (utils.isUUID(body.target)) {
				return body.target;
			}

			return this.card.get(body.target)
				.then((card) => {
					if (!card) {
						throw new Error(`No target found using slug ${body.target}`);
					}
					return card.id;
				});
		})
			.then(
				(target) => this.post<utils.ActionResponse>('action', _.assign({}, body, { target })),
			)
			.then((response) => {
				if (response.data.data.results.error) {
					throw new Error(response.data.data.results.data);
				}

				utils.debug(`Action ${body.action} complete in ${Date.now() - start}ms`);

				return response;
			});
	}

	public stream(query: JSONSchema6 | string | Card) {
		return new JellyfishStream('query', { query }, this.API_URL, this.authToken);
	}
}

export const jellyfishSdk = ({
	apiUrl,
	apiPrefix,
	authToken,
}: SdkOptions) => {
	return new Sdk(apiUrl, apiPrefix, authToken);
};

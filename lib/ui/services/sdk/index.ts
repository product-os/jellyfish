import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card, Type } from '../../../Types';
import { debug } from '../helpers';
import store, { actionCreators } from '../store';
import { API_PREFIX, API_URL } from './constants';
import { getToken, queryStringEncode } from './utils';

import Ajv = require('ajv');
import ajvKeywords = require('ajv-keywords');
import metaSchema6 = require('ajv/lib/refs/json-schema-draft-06.json');

export { JellyfishStream, streamQuery, streamQueryView } from './sockets';

const ajv = new Ajv();
ajvKeywords(ajv);
ajv.addMetaSchema(metaSchema6);

const trimSlash = (s: string) => _.trim(s, '/');

const API_BASE = `${trimSlash(API_URL)}/${trimSlash(API_PREFIX)}/`;

const withAuth = (options?: AxiosRequestConfig) => _.merge(
	{},
	options,
	{
		headers: {
			authorization: `Bearer ${getToken()}`,
		},
	},
);

const handleError = (e: AxiosError) => {
	if (e.response && e.response.data) {
		throw new Error(e.response.data.data);
	}
	throw e;
};

const getRequest = (endpoint: string, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.get(`${API_BASE}${endpoint}`, withAuth(options) 	))
		.catch(handleError);

const postRequest = (endpoint: string, body: any, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.post(`${API_BASE}${endpoint}`, body, withAuth(options)))
		.catch(handleError);

const deleteRequest = (endpoint: string, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.delete(`${API_BASE}${endpoint}`, withAuth(options)))
		.catch(handleError);

const patchRequest = (endpoint: string, body: any, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.patch(`${API_BASE}${endpoint}`, body, withAuth(options)))
		.catch(handleError);

export const addCard = (card: Partial<Card>): Promise<{ id: string, results: any }> =>
	postRequest('card', card)
		.then(response => response.data.data);

export const getCard = (idOrSlug: string): Promise<Card> =>
	getRequest(`card/${idOrSlug}`)
		.then(response => response.data.data);

export const deleteCard = (idOrSlug: string): Promise<Card> =>
	deleteRequest(`card/${idOrSlug}`)
		.then(response => response.data.data);

export const updateCard = (idOrSlug: string, body: Partial<Card>): Promise<Card> =>
	patchRequest(`card/${idOrSlug}`, body)
		.then(response => response.data.data);

export const query = <T = Card>(schema: JSONSchema6): Promise<T[]> =>
	getRequest(`query?${queryStringEncode(schema)}`)
		.then(response => response.data.data);

export const queryView = (id: string): Promise<Card[]> =>
	getRequest(`query-view/${id}`)
		.then(response => response.data.data);

export const getTimeline = (id: string): Promise<Card[]> => {
	const schema: JSONSchema6 = {
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					target: {
						type: 'string',
						const: id,
					},
				},
				additionalProperties: true,
				required: [ 'target' ],
			},
		},
		additionalProperties: true,
		required: [ 'data' ],
	};

	return query(schema)
		.then(cards => _.sortBy<Card>(cards, (card) => card.data!.timestamp));
};

export const action = (body: {
	target: string;
	action: string;
	arguments?: any;
	transient?: any;
}) =>
	Promise.try(() =>
		postRequest('action', body),
	);

export const getTypes = (): Promise<Type[]> => query<Type>({
	type: 'object',
	properties: {
		type: {
			const: 'type',
		},
	},
	additionalProperties: true,
});

export const signup = (payload: {
	username: string;
	email: string;
	password: string;
}) =>
	postRequest('signup', payload)
		.then(() => login({
			username: payload.username,
			password: payload.password,
		}));

export const login = (payload: {
	username: string;
	password: string;
}) =>
	postRequest('login', payload)
		.then((response) => {
			const responseData = response.data.data.results.data;
			if (response.data.data.results.error) {
				throw new Error(responseData);
			}
			const token = response.data.data.results.data;

			debug('GOT AUTH TOKEN', token);

			store.dispatch(actionCreators.setAuthToken(token));

			return Promise.all([
				getCard(token)
				.then((card) => getCard(card.data.actor))
				.then((userCard) => {
					debug('GOT USER', userCard);
					return userCard;
				}),
				getTypes(),
			])
			.then(([user, types]) => {
				store.dispatch(actionCreators.setUser(user));
				store.dispatch(actionCreators.setTypes(types));
			});
		});

export const getTypeCard = (type: string) =>
	_.find(store.getState().types, { slug: type });

export const compileSchema = (schema: JSONSchema6) => ajv.compile(schema);

export const getUsername = (() => {
	const usernameCache: { [id: string]: string } = {};

	return (userId: string): Promise<string> => Promise.try(() => {
		if (usernameCache[userId]) {
			return usernameCache[userId];
		}

		return getCard(userId)
		.then((userCard) => {
			const username = userCard ? userCard.slug!.replace('user-', '') : 'unknown user';
			usernameCache[userId] = username;

			return username;
		});
	});
})();

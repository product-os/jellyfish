import axios, { AxiosRequestConfig } from 'axios';
import * as Promise from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import { Card, Type } from '../../Types';
import { debug } from './helpers';
import store, { actionCreators } from './store';

const API_PREFIX = '/api/v1/';
const API_URL = 'http://localhost:8000';

const getToken = () => _.get(store.getState(), 'session.authToken');

const withAuth = (options?: AxiosRequestConfig) => _.merge(
	{},
	options,
	{
		headers: {
			authorization: `Bearer ${getToken()}`,
		},
	},
);

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
const queryStringEncode = (input: any) => {
	// Array of path/value tuples
	const flattened = flatten(input);

	// Convert array to query string
	return flattened.map((pair: any[]) =>
		pair.map(encodeURIComponent).join('='),
	).join('&');
};

const getRequest = (endpoint: string, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.get(`${API_URL}${API_PREFIX}${endpoint}`, withAuth(options) 	));

const postRequest = (endpoint: string, body: any, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.post(`${API_URL}${API_PREFIX}${endpoint}`, body, withAuth(options)));

const deleteRequest = (endpoint: string, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.delete(`${API_URL}${API_PREFIX}${endpoint}`, withAuth(options)))
		.then(response => {
			if (response.data.data.results.error) {
				throw new Error(response.data.data.results.data);
			}

			return response.data.data;
		});

const patchRequest = (endpoint: string, body: any, options?: AxiosRequestConfig) =>
	Promise.try(() => axios.patch(`${API_URL}${API_PREFIX}${endpoint}`, body, withAuth(options)))
		.then(response => {
			if (response.data.data.results.error) {
				throw new Error(response.data.data.results.data);
			}

			return response.data.data;
		});

export const addCard = (card: Card): Promise<Card> =>
	postRequest('card', card)
		.then(response => response.data.data);

export const getCard = (idOrSlug: string): Promise<Card> =>
	getRequest(`card/${idOrSlug}`)
		.then(response => response.data.data);

export const deleteCard = (idOrSlug: string): Promise<Card> =>
	deleteRequest(`card/${idOrSlug}`);

export const updateCard = (idOrSlug: string, body: Partial<Card>): Promise<Card> =>
	patchRequest(`card/${idOrSlug}`, body);

export const query = <T = Card>(schema: JSONSchema6): Promise<T[]> =>
	getRequest(`query?${queryStringEncode(schema)}`)
		.then(response => response.data.data);

export const queryView = (id: string): Promise<Card[]> =>
	getRequest(`query-view/${id}`)
		.then(response => response.data.data);

export const getTimeline = (id: string): Promise<Card[]> => {
	const schema: JSONSchema6 = {
		properties: {
			data: {
				type: 'object',
				properties: {
					target: {
						const: id,
					},
				},
				required: ['target'],
				additionalProperties: true,
			},
		},
		additionalProperties: true,
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
					return userCard.data;
				}),
				getTypes(),
			])
			.then(([user, types]) => {
				store.dispatch(actionCreators.setUser({ email: user.email }));
				store.dispatch(actionCreators.setTypes(types));
			});
		});

export const getTypeCard = (type: string) =>
	_.find(store.getState().types, { slug: type });


/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';

export interface Card {
	created_at: string;
	id: string;
	version: string;
	type: string;
	tags: string[];
	markers: string[];
	links: { [key: string]: any };
	requires: object[];
	capabilities: object[];
	active: boolean;
	data: { [key: string]: any };
	name?: string;
	slug: string;
	transient?: object;
}

export interface JellySchema extends JSONSchema6 {
	$$links?: {
		[k: string]: JSONSchema6;
	};
}

export interface Event extends Card {
	data: {
		timestamp: string;
		target: string;
		actor: string;
		payload?: { [key: string]: any };
	};
}

export interface EventRequest {
	target: Partial<Card> & { id: string, type: string };
	type: string;
	tags?: string[];
	slug?: string;
	payload?: { [key: string]: any };
}

export type ActionResponse<D = any> = {
	error: false;
	data: D;
} | {
	error: true;
	data: {
		message: string;
	};
};

export interface ServerResponse {
	error: boolean;
	data: any;
}

export interface SDKOptions {
	apiUrl: string;
	apiPrefix: string;
	authToken?: string;
}

export interface SDKInterface {
	getApiUrl: () => string | undefined;
	getAuthToken: () => string | undefined;
	setAuthToken: (token: string) => void;
	clearAuthToken: () => void;

	cancelAllRequests: (reason?: string) => void;
	cancelAllStreams: () => void;

	action: <D = any>(body: {
		card: string;
		action: string;
		arguments?: any;
	}) => Bluebird<D>;

	query: <T extends Card>(schema: JellySchema) => Bluebird<T[]>;

	post: <R = ServerResponse>(endpoint: string, body: any, options?: AxiosRequestConfig) => Bluebird<AxiosResponse<R> | void>;

	card: {
		get: (idOrSlug: string, options?: object) => Bluebird<Card | null>;
	};
}

export interface StreamEventMap {
	ready: {
		id: string,
		error: false;
	};

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

export interface QueryOptions {
	limit?: number;
	skip?: number;
	sortBy?: string | string[];
	sortDir?: 'asc' | 'desc';
}

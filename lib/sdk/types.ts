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
import * as Bluebird from 'bluebird';
import { JSONSchema6 } from 'json-schema';
import { Card } from './types';

export interface Card {
	id: string;
	type: string;
	version: string;
	tags: string[];
	links: object;
	active: boolean;
	requires: object[];
	capabilities: object[];
	data: { [key: string]: any };
	name?: string;
	slug: string;
	transient?: object;
}

export interface Event {
	timestamp: string;
	target: string;
	actor: string;
	payload?: { [key: string]: any };
}

export interface EventRequest {
	card: string;
	type: string;
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

	query: <T extends Card>(schema: JSONSchema6) => Bluebird<T[]>;

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

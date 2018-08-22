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

import { JSONSchema6 } from 'json-schema';
import { Dictionary } from 'lodash';

export type ActionFunction = (
	session: Session,
	context: Context,
	card: Card,
	request: Request,
) => Promise<any>;

export type ActionLibrary = Dictionary<ActionFunction>;

// This is treated as a pass-through straight to context ...
// ... so for now I'm not going to type it
export type Session = any;

export interface Card {
	id: string;
	type: string;
	tags: string[];
	links: object;
	active: boolean;
	data: { [key: string]: any };
	name?: string;
	slug?: string;
	transient?: object;
}

export interface Context {
	errors: {
		ActionsAuthenticationError: typeof Error;
		WorkerAuthenticationError: typeof Error;
		WorkerNoElement: typeof Error;
	};
	getCardById: (
		session: Session,
		id: string,
		options?: object,
	) => Promise<Card>;
	getCardBySlug: (
		session: Session,
		slug: string,
		options?: object,
	) => Promise<Card>;
	insertCard: (
		session: Session,
		type: Card,
		options: object,
		card: Partial<Card>,
	) => Promise<Card>;
	privilegedSession: Session;
}

export interface Request {
	actor: string;
	arguments: Dictionary<any>;
	filter?: JSONSchema6;
	timestamp: string;
}

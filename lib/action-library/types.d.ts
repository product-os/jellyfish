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

import { Dictionary } from 'lodash';

export type ActionFunction = (
	session: JellyfishSession,
	context: Context,
	card: Card,
	request: ActionData,
) => Promise<Card>;

export type ActionLibrary = Dictionary<ActionFunction>;

export type JellyfishSession = string;

export interface Card {
	id: string;
	type: string;
	tags: string[];
	links: object;
	active: boolean;
	data: { [key: string]: any };
	name?: string;
	slug?: string;
}

export interface Context {
	errors: {
		ActionsAuthenticationError: typeof Error;
		WorkerAuthenticationError: typeof Error;
		WorkerNoElement: typeof Error;
	};
	getCardById: (
		session: JellyfishSession,
		id: string,
		options?: object,
	) => Promise<Card>;
	getCardBySlug: (
		session: JellyfishSession,
		slug: string,
		options?: object,
	) => Promise<Card>;
	insertCard: (
		session: JellyfishSession,
		type: Card,
		options: object,
		card: Partial<Card>,
	) => Promise<Card>;
	privilegedSession: JellyfishSession;
}

export interface ActionData {
	action?: string;
	actor?: string;
	arguments: Dictionary<any>;
	card?: Card;
	timestamp?: string;
}

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

/**
 * A no-op type that applies a semantic meaning
 */
type JellyfishSession = string;

// TODO put this into an importable module at a higher level
interface Card {
	id: string;
	slug?: string;
	name?: string;
	type: string;
	tags: string[];
	links: object;
	active: boolean;
	data: object;
}

// TODO put this into an importable module at a higher level
interface Context {
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
	query: (
		session: JellyfishSession,
		query: JSONSchema6,
		options?: object,
	) => Promise<Card[]>;
}

// TODO put this into an importable module at a higher level
interface EvalTemplate {
	$eval: string;
}

// TODO put this into an importable module at a higher level
interface TemplateCard {
	id?: string | EvalTemplate;
	slug?: string | EvalTemplate;
	name?: string | EvalTemplate;
	type: string | EvalTemplate;
	tags: string[] | EvalTemplate;
	links: object | EvalTemplate;
	active: boolean | EvalTemplate;
	data: object | EvalTemplate;
}


/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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

// TODO give this a decent name
export type CreatableCard = Partial<Card> & { type: string };

export interface ExternalEventData {
	source: string;
	payload: any;
	headers: Dictionary<string>;
}

export interface TimeLine {
	// The entity at the head of the time-line
	head: CreatableCard;
	// All of the entities in the tail of the time-line
	tail: CreatableCard[];
}

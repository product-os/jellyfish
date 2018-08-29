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
import {
	Card,
	EvalTemplate,
	TemplateCard,
} from '../types';

/**
 * A array, each item of which is either a card or a set of cards that
 * may be inserted in parallel.
 */
type InsertionRequest = Array<TemplateCard | TemplateCard[]>;

/**
 * A template for how an event card may bve created.
 */
interface MessageTemplate extends TemplateCard {
	data: {
		data: {
			actor: string | EvalTemplate;
			target: string | EvalTemplate;
			timestamp: string | EvalTemplate;
			payload: object | EvalTemplate;
		};
	};
}

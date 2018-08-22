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

import * as _ from 'lodash';
import { Card, Context, Request, Session } from '../types';

export default async function(
	session: Session,
	context: Context,
	card: Card,
	request: Request,
): Promise<Card> {
	const updatedCard = _.mergeWith(
		{},
		card,
		request.arguments.properties,
		(objectValue, sourceValue) => {
			if (_.isArray(objectValue)) {
				return sourceValue;
			}

			// This lodash function expects undefined
			// eslint-disable-next-line no-undefined
			return undefined;
		},
	);

	if (_.isEqual(card, updatedCard)) {
		return card;
	}

	const typeCard = await context.getCardBySlug(session, updatedCard.type, {
		type: 'type',
	});

	if (!typeCard) {
		throw new context.errors.WorkerNoElement(
			`No such type: ${updatedCard.type}`,
		);
	}

	return context.insertCard(
		session,
		typeCard,
		{
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: true,
		},
		_.omit(updatedCard, ['type']),
	);
}

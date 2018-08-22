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

import { Card, Context, Request, Session } from '../types';

export default async function(
	session: Session,
	context: Context,
	card: Card,
	request: Request,
): Promise<Card> {
	const user = await context.getCardById(context.privilegedSession, card.id);

	if (!user) {
		throw new context.errors.ActionsAuthenticationError(
			`No such user: ${card.id}`,
		);
	}

	if (user.data.disallowLogin) {
		throw new context.errors.WorkerAuthenticationError('Login disallowed');
	}

	if (
		user.data.password &&
		request.arguments.password.hash !== user.data.password.hash
	) {
		throw new context.errors.WorkerAuthenticationError('Invalid password');
	}

	const sessionTypeCard = await context.getCardBySlug(session, 'session', {
		type: 'type',
	});

	if (!sessionTypeCard) {
		throw new context.errors.WorkerNoElement('No such type: session');
	}

	// Set the expiration date to be 7 days from now
	const expirationDate = new Date();
	expirationDate.setDate(expirationDate.getDate() + 7);

	return context.insertCard(
		context.privilegedSession,
		sessionTypeCard,
		{
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: false,
		},
		{
			data: {
				actor: card.id,
				expiration: expirationDate.toISOString(),
			},
		},
	);
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { v4 as uuidv4 } from 'uuid';
import * as assert from '@balena/jellyfish-assert';
import { core } from '@balena/jellyfish-types';
import { QueryFacade } from './query';
import { ActionFacade } from './action';

export class AuthFacade extends QueryFacade {
	actionFacade: ActionFacade;

	constructor(jellyfish?, actionFacade?) {
		super(jellyfish);
		this.actionFacade = actionFacade;
	}

	async logIn(context, sessionToken, credentials) {
		return this.actionFacade.processAction(context, sessionToken, {
			card: `user-${credentials.username}`.toLowerCase(),
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: credentials.password,
			},
		}) as any as core.Contract;
	}

	async refreshToken(context, sessionToken, ip) {
		const user = await this.whoami(context, sessionToken, ip);

		const expirationDate = new Date();
		expirationDate.setDate(expirationDate.getDate() + 7);

		return this.actionFacade.processAction(context, sessionToken, {
			card: 'session',
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				slug: `session-ui-${user!.slug}-${Date.now()}-${uuidv4()}`,
				data: {
					actor: user!.id,
					expiration: expirationDate.toISOString(),
				},
			},
		}) as any as core.Contract;
	}

	async logOut(context, sessionToken) {
		await this.actionFacade.processAction(context, sessionToken, {
			card: sessionToken,
			type: 'session',
			action: 'action-delete-card@1.0.0',
		});
	}

	async whoami(context, sessionToken, ipAddress) {
		// Use the admin session, as the user invoking this function
		// might not have enough access to read its entire session card.
		const result = await this.jellyfish.getCardById(
			context,
			this.jellyfish.sessions.admin,
			sessionToken,
		);
		assert.USER(
			context,
			result,
			this.jellyfish.errors.JellyfishInvalidSession,
			'Session does not exist',
		);

		const schema = {
			type: 'object',
			$$links: {
				'is member of': {
					type: 'object',
					additionalProperties: true,
				},
			},
			properties: {
				id: {
					type: 'string',
					const: result.data.actor,
				},
				type: {
					type: 'string',
					const: 'user@1.0.0',
				},
				links: {
					type: 'object',
					additionalProperties: true,
				},
			},
			required: ['id'],
			additionalProperties: true,
		};

		// Try and load the user with attached org data, otherwise load them without it.
		// TODO: Fix our broken queries so that we can optionally get linked data
		let user = await this.queryAPI(
			context,
			sessionToken,
			schema,
			{
				limit: 1,
			},
			ipAddress,
		).then((elements) => {
			return elements[0] || null;
		});

		if (!user) {
			user = await this.jellyfish.getCardById(
				context,
				sessionToken,
				result.data.actor,
			);
		}

		return user;
	}
}

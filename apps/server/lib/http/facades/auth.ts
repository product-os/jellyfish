import * as assert from '@balena/jellyfish-assert';
import {
	Contract,
	errors as coreErrors,
	JsonSchema,
	SessionContract,
} from 'autumndb';
import { QueryFacade } from './query';

export class AuthFacade extends QueryFacade {
	async whoami(context, session) {
		// Use the admin session, as the user invoking this function
		// might not have enough access to read its entire session contract.
		const result = await this.kernel.getContractById<SessionContract>(
			context,
			this.kernel.adminSession()!,
			session,
		);
		assert.USER(
			context,
			result,
			coreErrors.JellyfishInvalidSession,
			'Session does not exist',
		);

		const schema: JsonSchema = {
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
					const: result!.data.actor,
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
		let user = (
			await this.queryAPI(context, session, schema, {
				limit: 1,
			})
		)[0] as Contract | null;

		if (!user) {
			user = await this.kernel.getContractById(
				context,
				session,
				result!.data.actor,
			);
		}

		return user;
	}
}

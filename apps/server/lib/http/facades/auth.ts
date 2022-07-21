import type { AutumnDBSession, JsonSchema } from 'autumndb';
import { QueryFacade } from './query';

export class AuthFacade extends QueryFacade {
	async whoami(context, session: AutumnDBSession) {
		const schema: JsonSchema = {
			type: 'object',
			// optionally fetch the user's orgs
			anyOf: [
				{
					$$links: {
						'is member of': {
							type: 'object',
							additionalProperties: true,
						},
					},
				},
				true,
			],
			properties: {
				id: {
					type: 'string',
					const: session.actor.id,
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

		const [user] = await this.queryAPI(context, session, schema, {
			limit: 1,
		});

		return user || null;
	}
}

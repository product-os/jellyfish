import { LogContext } from '@balena/jellyfish-logger';
import {
	JsonSchema,
	Kernel,
	errors as coreErrors,
	ViewContract,
} from 'autumndb';
import _ from 'lodash';

export class QueryFacade {
	kernel: Kernel;

	constructor(kernel: Kernel) {
		this.kernel = kernel;
	}

	private async getQuerySchema(
		logContext: LogContext,
		session: string,
		query: JsonSchema | string,
	): Promise<JsonSchema | ViewContract> {
		if (!_.isString(query)) {
			return query;
		}

		// Now try and load the view by slug
		const viewContractFromSlug = await this.kernel.getContractBySlug(
			logContext,
			session,
			`${query}@latest`,
		);

		if (
			viewContractFromSlug &&
			viewContractFromSlug.type.split('@')[0] === 'view'
		) {
			return viewContractFromSlug;
		}

		try {
			// Try and load the view by id first
			const viewContractFromId = await this.kernel.getContractById(
				logContext,
				session,
				query,
			);

			if (
				!viewContractFromId ||
				viewContractFromId.type.split('@')[0] !== 'view'
			) {
				throw new coreErrors.JellyfishNoView(`Unknown view: ${query}`);
			}

			return viewContractFromId;
		} catch (error) {
			throw new coreErrors.JellyfishNoView(`Unknown view: ${query}`);
		}
	}

	async queryAPI(
		logContext: LogContext,
		session: string,
		queryIsh: JsonSchema | string,
		options,
	) {
		const schema = await this.getQuerySchema(logContext, session, queryIsh);

		const data = await this.kernel.query(logContext, session, schema, options);

		return data;
	}
}

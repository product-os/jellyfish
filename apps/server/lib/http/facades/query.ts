import { getLogger, LogContext } from '@balena/jellyfish-logger';
import type { JsonSchema } from '@balena/jellyfish-types';
import type { ViewContract } from '@balena/jellyfish-types/build/core';
import { Kernel, errors as coreErrors } from 'autumndb';
import _ from 'lodash';

const logger = getLogger(__filename);

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
		ipAddress,
	) {
		const schema = await this.getQuerySchema(logContext, session, queryIsh);
		const startDate = new Date();

		logger.info(logContext, 'JSON Schema query start', {
			date: startDate,
			ip: ipAddress,
			schema,
		});

		const data = await this.kernel.query(logContext, session, schema, options);
		const endDate = new Date();
		const queryTime = endDate.getTime() - startDate.getTime();
		logger.info(logContext, 'JSON Schema query end', {
			time: queryTime,
		});

		return data;
	}
}

import _ from 'lodash';
import Bluebird from 'bluebird';
import { getLogger } from '@balena/jellyfish-logger';
import { Kernel, errors as coreErrors } from '@balena/jellyfish-core';

const logger = getLogger(__filename);

export class QueryFacade {
	kernel: Kernel;

	constructor(kernel: Kernel) {
		this.kernel = kernel;
	}

	async queryAPI(context, session, query, options, ipAddress) {
		return Bluebird.try(async () => {
			if (!_.isString(query)) {
				return query;
			}

			// Now try and load the view by slug
			const viewCardFromSlug = await this.kernel.getContractBySlug(
				context,
				session,
				`${query}@latest`,
			);

			if (viewCardFromSlug && viewCardFromSlug.type.split('@')[0] === 'view') {
				return viewCardFromSlug;
			}

			try {
				// Try and load the view by id first
				const viewCardFromId = await this.kernel.getContractById(
					context,
					session,
					query,
				);

				if (!viewCardFromId || viewCardFromId.type.split('@')[0] !== 'view') {
					throw new coreErrors.JellyfishNoView(`Unknown view: ${query}`);
				}

				return viewCardFromId;
			} catch (error) {
				throw new coreErrors.JellyfishNoView(`Unknown view: ${query}`);
			}
		}).then(async (schema) => {
			const startDate = new Date();

			logger.info(context, 'JSON Schema query start', {
				date: startDate,
				ip: ipAddress,
				schema,
			});

			const data = await this.kernel.query(context, session, schema, options);
			const endDate = new Date();
			const queryTime = endDate.getTime() - startDate.getTime();
			logger.info(context, 'JSON Schema query end', {
				time: queryTime,
			});

			return data;
		});
	}
}

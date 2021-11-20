import _ from 'lodash';
import Bluebird from 'bluebird';
import { getLogger } from '@balena/jellyfish-logger';

const logger = getLogger(__filename);

export class QueryFacade {
	jellyfish;

	constructor(jellyfish) {
		this.jellyfish = jellyfish;
	}

	async queryAPI(context, sessionToken, query, options, ipAddress) {
		return Bluebird.try(async () => {
			if (!_.isString(query)) {
				return query;
			}

			// Now try and load the view by slug
			const viewCardFromSlug = await this.jellyfish.getCardBySlug(
				context,
				sessionToken,
				`${query}@latest`,
			);

			if (viewCardFromSlug && viewCardFromSlug.type.split('@')[0] === 'view') {
				return viewCardFromSlug;
			}

			try {
				// Try and load the view by id first
				const viewCardFromId = await this.jellyfish.getCardById(
					context,
					sessionToken,
					query,
				);

				if (!viewCardFromId || viewCardFromId.type.split('@')[0] !== 'view') {
					throw new this.jellyfish.errors.JellyfishNoView(
						`Unknown view: ${query}`,
					);
				}

				return viewCardFromId;
			} catch (error) {
				throw new this.jellyfish.errors.JellyfishNoView(
					`Unknown view: ${query}`,
				);
			}
		}).then(async (schema) => {
			const startDate = new Date();

			logger.info(context, 'JSON Schema query start', {
				date: startDate,
				ip: ipAddress,
				schema,
			});

			const data = await this.jellyfish.query(
				context,
				sessionToken,
				schema,
				options,
			);
			const endDate = new Date();
			const queryTime = endDate.getTime() - startDate.getTime();
			logger.info(context, 'JSON Schema query end', {
				time: queryTime,
			});

			return data;
		});
	}
}

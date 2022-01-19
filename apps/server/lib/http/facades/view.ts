import _ from 'lodash';
import jsone from 'json-e';
import skhema from 'skhema';
import * as assert from '@balena/jellyfish-assert';
import type { core } from '@balena/jellyfish-types';
import type { QueryFacade } from './query';

export class ViewFacade {
	jellyfish: core.JellyfishKernel;
	queryFacade: QueryFacade;

	constructor(jellyfish?, queryFacade?) {
		this.jellyfish = jellyfish;
		this.queryFacade = queryFacade;
	}

	async queryByView(context, session, viewSlug, params, options, ipAddress) {
		if (!_.includes(viewSlug, '@')) {
			throw new Error('View slug must include a version');
		}

		return this.jellyfish
			.getCardBySlug(context, session, viewSlug)
			.then((view) => {
				if (!view) {
					return null;
				}

				let query: any = null;
				if (_.has(view, ['data', 'arguments'])) {
					assert.INTERNAL(
						context,
						skhema.isValid(view.data.arguments as any, params),
						Error,
						"Params don't match schema of view params",
					);

					query = jsone(view, params);
				} else {
					query = view;
				}

				return this.queryFacade.queryAPI(
					context,
					session,
					query,
					options,
					ipAddress,
				);
			});
	}
}

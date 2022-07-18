import * as assert from '@balena/jellyfish-assert';
import type { Kernel } from 'autumndb';
import jsone from 'json-e';
import _ from 'lodash';
import skhema from 'skhema';
import type { QueryFacade } from './query';

export class ViewFacade {
	kernel: Kernel;
	queryFacade: QueryFacade;

	constructor(kernel: Kernel, queryFacade?) {
		this.kernel = kernel;
		this.queryFacade = queryFacade;
	}

	async queryByView(context, session, viewSlug, params, options) {
		if (!_.includes(viewSlug, '@')) {
			throw new Error('View slug must include a version');
		}

		return this.kernel
			.getContractBySlug(context, session, viewSlug)
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

				return this.queryFacade.queryAPI(context, session, query, options);
			});
	}
}

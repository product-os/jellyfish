/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import jsone from 'json-e';
import skhema from 'skhema';
import * as assert from '@balena/jellyfish-assert';
import { core } from '@balena/jellyfish-types';

export class ViewFacade {
	jellyfish: core.JellyfishKernel;
	queryFacade: any;

	constructor (jellyfish: core.JellyfishKernel, queryFacade) {
		this.jellyfish = jellyfish
		this.queryFacade = queryFacade
	}

	async queryByView (context, sessionToken, viewSlug, params, options, ipAddress) {
		if (!_.includes(viewSlug, '@')) {
			throw new Error('View slug must include a version')
		}

		return this.jellyfish.getCardBySlug(context, sessionToken, viewSlug)
			.then((view) => {
				if (!view) {
					return null
				}

				let query = null
				if (_.has(view, [ 'data', 'arguments' ])) {
					assert.INTERNAL(context, skhema.isValid(view.data.arguments, params),
						Error, 'Params don\'t match schema of view params')

					query = jsone(view, params)
				} else {
					query = view
				}

				return this.queryFacade.queryAPI(context, sessionToken, query, options, ipAddress)
			})
	}
}

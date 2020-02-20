/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const jsone = require('json-e')
const skhema = require('skhema')
const assert = require('../../../../lib/assert')

module.exports = class ViewFacade {
	constructor (jellyfish, queryFacade) {
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

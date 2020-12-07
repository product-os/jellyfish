/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This mixin adds all relationships defined in the SDK links-constraints.js
const _ = require('lodash')
const {
	constraints
} = require('@balena/jellyfish-client-sdk/lib/link-constraints')

const getRelationships = (slug) => {
	if (!slug) {
		return []
	}

	return _.compact(constraints.map(({
		name, data
	}) => {
		if (data.from === slug) {
			return {
				title: data.title,
				link: name,
				type: data.to
			}
		}

		return null
	}))
}

module.exports = (slug) => {
	return {
		data: {
			meta: {
				relationships: getRelationships(slug)
			}
		}
	}
}

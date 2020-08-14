/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const deref = require('json-schema-deref-sync')
const sensibleDefaults = require('./with-sensible-defaults')
const baseUiSchema = require('./with-ui-schema')

const mergeWithUniqConcatArrays = (objValue, srcValue) => {
	if (_.isArray(objValue)) {
		return _.uniq(objValue.concat(srcValue))
	}
	// eslint-disable-next-line no-undefined
	return undefined
}

module.exports = {
	mixin: (...mixins) => {
		return (base) => {
			return _.mergeWith({}, base, ...mixins, mergeWithUniqConcatArrays)
		}
	},
	initialize: (card) => {
		const snippets = [ {}, sensibleDefaults, card ]

		// All type cards should have a UI schema
		if (card.type.split('@')[0] === 'type') {
			snippets.push(baseUiSchema)
		}
		const intializedCard = _.mergeWith(...snippets, mergeWithUniqConcatArrays)

		// Dereference all $ref values
		return deref(intializedCard, {
			failOnMissing: true,
			mergeAdditionalProperties: true
		})
	}
}

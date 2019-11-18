/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const jsonSchema = require('./json-schema')

/**
 * @summary Get the schema of a view card
 * @function
 * @public
 *
 * @param {Object} card - view card
 * @returns {(Object|Null)} schema
 */
exports.getSchema = (card) => {
	if (!card) {
		return null
	}

	if (card.data && card.data.schema) {
		return card.data.schema
	}

	const conjunctions = _.map(_.get(card, [ 'data', 'allOf' ]), 'schema')
	const disjunctions = _.map(_.get(card, [ 'data', 'anyOf' ]), 'schema')

	if (_.isEmpty(conjunctions) && _.isEmpty(disjunctions)) {
		return null
	}

	if (!_.isEmpty(disjunctions)) {
		conjunctions.push({
			anyOf: disjunctions
		})
	}

	return jsonSchema.merge(conjunctions)
}

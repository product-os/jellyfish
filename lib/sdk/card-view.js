/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const jsonSchema = require('./json-schema')

/**
 * @summary Get the schema of a view card
 * @function
 * @public
 *
 * @param {Object} card - card view
 * @returns {Object} JSON Schema
 *
 * @example
 * const schema = cardView.getSchema({ ... })
 */
exports.getSchema = (card) => {
	const filters = _.get(card, [ 'data', 'filters' ])
	if (!filters) {
		return null
	}

	return jsonSchema.merge(_.map(filters, 'schema'))
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const skhema = require('skhema')
const queue = require('./queue')

exports.filter = (schema, element) => {
	const result = skhema.filter(schema, element)

	// If additionalProperties is false, remove properties that haven't been
	// explicitly selected. This is done because the Skhema module will merge
	// anyOf branches into the top level properties before applying the filter
	// (which is correct) however, due to the Jellyfish permissions system,
	// properties may be added to the result that the initial query did not
	// specify, depending on which permission views are merged in.
	if (schema.additionalProperties === false) {
		for (const item of _.castArray(element)) {
			for (const key in item) {
				if (!schema.properties[key]) {
					Reflect.deleteProperty(item, key)
				}
			}
		}
	}

	return result
}

/*
 * Get a set of pending action requests from the queue.
 *
 * Clients that require accessing the pending queue are advised
 * to use this function for performance reasons rather than doing
 * a more generic JSON Schema query on the cards table.
 */
exports.getPendingRequests = async (context, backend, options = {}) => {
	const results = await queue.getElements(context, backend.connection, {
		table: 'requests',
		limit: options.limit,
		skip: options.skip
	})

	return exports.filter(options.mask || {
		type: 'object',
		additionalProperties: true
	}, results)
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const skhema = require('skhema')

exports.filter = (schema, element, errors) => {
	if (_.isNil(schema)) {
		return element
	}

	const result = _.attempt(skhema.filter, schema, element)
	if (_.isError(result)) {
		if (result instanceof skhema.InvalidSchema) {
			const error = new errors.JellyfishInvalidSchema(result.message)
			error.expected = true
			throw error
		}

		throw result
	}

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

// FIXME
// this function is intended to make the transition between dates as
// strings to actual dates smoother: it ensures that returned dates
// are still strings in ISO format
// beware that when reading a jsonb column with dates stored as dates
// the output json will end with '+00' rathen than 'Z'
// we should not to this conversion and instead rely on Date objects
exports.convertDatesToISOString = (row) => {
	if (!row) {
		return row
	}
	if (row.created_at) {
		row.created_at = new Date(row.created_at).toISOString()
	}
	if (row.updated_at) {
		row.updated_at = new Date(row.updated_at).toISOString()
	}

	// FIXME remove references to new_* columns
	Reflect.deleteProperty(row, 'new_created_at')
	Reflect.deleteProperty(row, 'new_updated_at')

	return row
}

exports.removeLinkMetadataFields = (row) => {
	Reflect.deleteProperty(row, '$link direction$')
	Reflect.deleteProperty(row, '$link type$')
	Reflect.deleteProperty(row, '$parent id$')
}

exports.removeVersionFields = (row) => {
	if (row) {
		const version = [
			row.version_major,
			row.version_minor,
			row.version_patch
		].filter(_.isNumber).join('.') || row.version
		if (version) {
			row.version = version
		}

		Reflect.deleteProperty(row, 'version_major')
		Reflect.deleteProperty(row, 'version_minor')
		Reflect.deleteProperty(row, 'version_patch')
	}

	return row
}

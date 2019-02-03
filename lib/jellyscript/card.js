/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const utils = require('./utils')
const FORMULA_PROPERTY = '$$formula'

const eachDeep = (object, callback, breadcrumb = []) => {
	for (const key of Object.keys(object)) {
		const value = object[key]
		const absoluteKey = breadcrumb.concat([ key ])

		if (_.isPlainObject(value)) {
			eachDeep(value, callback, absoluteKey)
			continue
		}

		if (_.isArray(value)) {
			_.each(value, (element, index) => {
				eachDeep(element, callback, absoluteKey.concat([ index ]))
			})

			continue
		}

		// eslint-disable-next-line callback-return
		callback(value, absoluteKey)
	}
}

const getRealObjectPath = (schemaPath) => {
	return schemaPath.slice(0, schemaPath.length - 1).filter((fragment) => {
		if (_.isNumber(fragment)) {
			return false
		}

		return ![
			'properties',
			'anyOf',
			'allOf',
			'oneOf'
		].includes(fragment)
	})
}

const formulaSchemaCache = new Map()

exports.getFormulasPaths = (schema) => {
	const hash = utils.hashObject(schema)

	if (formulaSchemaCache.has(hash)) {
		return formulaSchemaCache.get(hash)
	}

	const paths = []

	eachDeep(schema, (value, key) => {
		if (_.last(key) === FORMULA_PROPERTY) {
			paths.push({
				formula: value,
				output: getRealObjectPath(key),
				type: _.get(schema, _.initial(key).concat([ 'type' ]))
			})
		}
	})

	formulaSchemaCache.set(hash, paths)
	return paths
}

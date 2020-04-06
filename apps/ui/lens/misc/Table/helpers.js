/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import flatten from 'flat'

/**
 * @summary Recursively get all fields defined in the type schema
 * @function
 *
 * @param {Object} schemaObject - type schema
 * @returns {(Object)} flattend Type Schema
 *
 * @example
 * const customflat = flattenSchemaProperties(type)
 */
export const flattenSchemaProperties = function (schemaObject) {
	// Recursively get all fields defined in the type schema, in a flat format
	// without losing information on child properties
	let newSchema = {}

	const flattenSchema = function (object, key) {
		// First check if the current object is a type card
		if (_.get(object, [ 'type' ]) === 'type@1.0.0') {
			// Get the schema of the type card
			const schemaProperties = _.get(object, [
				'data',
				'schema'
			])

			// Catch cards that have no schema properties
			if (!schemaProperties) {
				return null
			}

			return {
				...newSchema,
				...flattenSchema(schemaProperties)
			}
		}

		// Exit out of the function when there are no nested properties
		if ((_.get(object, [ 'type' ]) !== 'object') && !_.has(object, [ 'properties' ])) {
			return object
		}

		// Flatten the object one level deep and set the key
		const flattendItems = flatten(object.properties, {
			maxDepth: 1,
			transformKey: (childKey) => {
				if (key) {
					return `${key}.${childKey}`
				}

				return childKey
			}
		})

		// Start building newSchema object incrementally
		newSchema = {
			...newSchema,
			...flattendItems
		}

		// Check if all items have been flattend
		_.map(flattendItems, (childObject, childKey) => {
			// If the childObject still has properties
			if (childObject.type === 'object' && _.has(childObject, [ 'properties' ])) {
				// Omit the childObject
				newSchema = _.omit(newSchema, childKey)

				// Run flattenSchema again
				flattenSchema(childObject, childKey)
			}
		})

		// If everything has been flattend return newSchema
		return newSchema
	}

	return flattenSchema(schemaObject)
}

/**
 * @summary Get all fields defined in the type schema, in flat format
 * @function
 *
 * @param {Object} type - type schema
 * @returns {(Object)} type fields
 *
 * @example
 * const typeFields = getTypeFields(this.props.type)
 */

export const getTypeFields = _.memoize((type) => {
	// If typeschema is undefined it should return the most basic column structure.
	if (!type) {
		return {
			name: 'Name',
			created_at: 'Created at'
		}
	}

	//  Get all fields defined in the type schema, in a flat format
	// without losing information on child properties
	const customflat = flattenSchemaProperties(type)

	// Omit the items that are of the following types
	// - pattern
	// Also Omit the items that are of the following format
	// - markdown
	// - mermaid
	const filteredSchema = _.omitBy(customflat, (item, key) => {
		const omittedTypes = [ 'pattern' ]
		if (omittedTypes.includes(key)) {
			return true
		}

		const omittedFormats = [ 'markdown', 'mermaid' ]
		if (omittedFormats.includes(item.format)) {
			return true
		}

		return false
	})

	// Format the fields to just the key and it's label when the field
	// doesn't have a label, use the name of the key instead
	const schemaLabels = _.mapValues(filteredSchema, (item, key) => {
		return item.title ? item.title : key
	})

	// Return the schemaLabels with the type.name and type.type
	return {
		name: type.name,
		tags: 'tags',
		...schemaLabels
	}
})

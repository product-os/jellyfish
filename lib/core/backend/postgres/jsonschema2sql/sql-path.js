/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const SqlFragmentBuilder = require('./fragment-builder')

/**
 * Abstraction for SQL field paths. Note that this implicitly depends on the
 * actual database layout and if that changes this may need to be updated too.
 */
module.exports = class SqlPath {
	/**
	 * Get the SQL expression for the`version` computed field.
	 *
	 * @param {String} table - The table name/alias.
	 * @returns {String} The SQL expression for the computed field.
	 */
	static getVersionComputedField (table) {
		return `CONCAT_WS('.',
COALESCE(${table}.version_major, '1')::text,
COALESCE(${table}.version_minor, '0')::text,
COALESCE(${table}.version_patch, '0')::text
)`
	}

	/**
	 * Build an `SqlPath` from an array without having to push each element
	 * individually. This is also faster as it avoids recomputing the
	 * `isProcessing*` state with each new `push()`.
	 *
	 * @param {Array} array - The array representing the path where each item
	 *        is an element and the first item is the table.
	 * @returns {SqlPath} An `SqlPath` pointing to the same path as `array`.
	 */
	static fromArray (array) {
		const path = new SqlPath()
		path.path = array
		path.recalculateIsProcessingState()

		return path
	}

	static toJsonSelector (path) {
		const selector = path
			.map((element) => {
				return JSON.stringify(element)
			})
			.join(', ')

		return pgFormat.literal(`{${selector}}`)
	}

	/**
	 * Constructor.
	 *
	 * @param {SqlPath} parent - If this `SqlPath` denotes paths in a subquery,
	 *        `parent` must be the `SqlPath` that points to the field that this
	 *         subquery uses as table. Otherwise, `parent` must be `undefined`.
	 */
	constructor (parent) {
		this.path = []
		this.parent = parent ? parent.flattened().path : []
		this.recalculateIsProcessingState()
		this.rootIsJson = this.isProcessingJsonProperty
	}

	/**
	 * Extend the path by one element.
	 *
	 * @param {String} element - The element to pushed.
	 */
	push (element) {
		this.path.push(element)

		const pathDepth = this.getDepth()
		if (pathDepth === 1) {
			this.isProcessingTable = false
			this.isProcessingColumn = true
		} else if (pathDepth === 2) {
			this.isProcessingColumn = false
			this.isProcessingSubColumn = this.getSecondToLast() !== 'data'
			this.isProcessingJsonProperty = !this.isProcessingSubColumn
		} else if (pathDepth === 3) {
			this.isProcessingSubColumn = false
		}
	}

	/**
	 * Pop the last element.
	 */
	pop () {
		this.path.pop()
		this.recalculateIsProcessingState()
	}

	/**
	 * Get the second to last element.
	 *
	 * @returns {String} The second to last element.
	 */
	getSecondToLast () {
		if (this.path.length === 0) {
			return this.parent[this.parent.length - 2]
		} else if (this.path.length === 1) {
			return this.parent[this.parent.length - 1]
		}

		return this.path[this.path.length - 2]
	}

	/**
	 * Get the last element.
	 *
	 * @returns {String} The last element.
	 */
	getLast () {
		if (this.path.length === 0) {
			return this.parent[this.parent.length - 1]
		}

		return this.path[this.path.length - 1]
	}

	/**
	 * Set the last element without resizing the underlying array.
	 *
	 * @param {String} element - The element to be set as last.
	 */
	setLast (element) {
		this.path[this.path.length - 1] = element

		const pathDepth = this.getDepth()
		if (pathDepth === 1) {
			this.isProcessingJsonProperty = element === 'data'
		} else if (pathDepth === 2) {
			this.isProcessingSubColumn = this.getSecondToLast() !== 'data'
			this.isProcessingJsonProperty = !this.isProcessingSubColumn
		}
	}

	getDepth () {
		const depth = this.path.length + this.parent.length
		const adjustment = this.path.length === 0 && this.parent.length > 0 ? 1 : 0

		return depth + adjustment
	}

	recalculateIsProcessingState () {
		const pathDepth = this.getDepth()
		this.isProcessingTable = pathDepth === 0
		this.isProcessingColumn = pathDepth === 1
		this.isProcessingSubColumn = pathDepth === 2 && this.getSecondToLast() !== 'data'

		const isData = pathDepth === 1 && this.getLast() === 'data'
		const isDataProperty = pathDepth === 2 && !this.isProcessingSubColumn
		this.isProcessingJsonProperty = isData || isDataProperty || pathDepth > 2
	}

	/**
	 * Return `this` as an array where each element is a path component.
	 *
	 * @returns {Array} `this` as an array.
	 */
	asArray () {
		return this.path
	}

	/**
	 * Return a clone of `this`.
	 *
	 * @returns {SqlPath} A clone of `this`.
	 */
	cloned () {
		const clone = _.clone(this)
		clone.path = _.clone(this.path)
		clone.parent = _.clone(this.parent)

		return clone
	}

	/**
	 * Build a new `SqlPath` where `this` and `parent` are merged.
	 *
	 * @returns {SqlPath} The flat `SqlPath`.
	 */
	flattened () {
		if (this.parent.length > 0) {
			return SqlPath.fromArray(_.concat(this.parent, this.path))
		}

		return SqlPath.fromArray(_.clone(this.path))
	}

	/**
	 * Format this filter by pushing string fragments into `builder`.
	 *
	 * @param {SqlFragmentBuilder} builder - Builder for the final SQL string.
	 * @param {Object} options - An optional object containing extra options.
	 *        Accepted options are:
	 *        - `asText`: return the field with the proper cast into text.
	 *        - `forceCast`: apply as cast (if requested) even for columns.
	 */
	toSqlInto (builder, options = {}) {
		const table = builder.getTable()
		if (this.isProcessingColumn && this.getLast() === 'version') {
			builder.push(SqlPath.getVersionComputedField(table))

			return
		}

		let operator = '#>'
		let start = ''
		let end = ''
		if (options.asText) {
			operator = '#>>'
			if (this.isProcessingJsonProperty || options.forceCast) {
				start = '('
				end = ')::text'
			}
		}

		builder
			.push(start)
			.push(table)

		if (this.rootIsJson) {
			builder
				.push(operator)
				.push(SqlPath.toJsonSelector(this.path))
		} else {
			const column = pgFormat.ident(this.path[0] || table)
			if (this.path.length > 0) {
				builder
					.push('.')
					.push(column)
			}
			if (this.path.length > 1) {
				builder
					.push(operator)
					.push(SqlPath.toJsonSelector(this.path.slice(1)))
			}
		}

		builder.push(end)
	}

	/**
	 * Build an SQL field from `this`.
	 *
	 * @param {String} table - Table that `this` will refer to.
	 * @param {Object} options - An optional object containing extra options.
	 *        See {@link SqlPath#toSqlInto} for a list of accepted options.
	 * @returns {String} The SQL field.
	 */
	toSql (table, options) {
		const builder = new SqlFragmentBuilder(table)
		this.toSqlInto(builder, options)

		return builder.toSql()
	}
}

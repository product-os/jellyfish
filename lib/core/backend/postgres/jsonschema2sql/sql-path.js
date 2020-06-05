/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')

/**
 * Abstraction for SQL field paths. Note that this implicitly depends on the
 * actual database layout and if it changes this may need to be updated too.
 */
module.exports = class SqlPath {
	static getVersionComputedField (table) {
		return `CONCAT_WS('.',
COALESCE(${table}.version_major, '1')::text,
COALESCE(${table}.version_minor, '0')::text,
COALESCE(${table}.version_patch, '0')::text
)`
	}

	static toJsonSelector (path) {
		const selector = path
			.map((element) => {
				return JSON.stringify(element)
			})
			.join(', ')

		return pgFormat.literal(`{${selector}}`)
	}

	constructor (table, parentSqlPath) {
		this.path = [ table ]
		this.parent = parentSqlPath ? parentSqlPath.path : []
		this.recalculateIsProcessingState()
		this.rootIsJson = this.isProcessingJsonProperty
	}

	push (element) {
		this.path.push(element)

		const pathDepth = this.getDepth()
		if (pathDepth === 2) {
			this.isProcessingTable = false
			this.isProcessingColumn = true
		} else if (pathDepth === 3) {
			this.isProcessingColumn = false
			this.isProcessingSubColumn = this.getSecondToLast() !== 'data'
			this.isProcessingJsonProperty = !this.isProcessingSubColumn
		} else if (pathDepth === 4) {
			this.isProcessingSubColumn = false
		}
	}

	pop () {
		this.path.pop()
		this.recalculateIsProcessingState()
	}

	getTable () {
		return this.path[0]
	}

	getSecondToLast () {
		if (this.path.length > 2) {
			return this.path[this.path.length - 2]
		} else if (this.path.length === 2) {
			if (this.parent.length === 0) {
				return this.path[this.path.length - 2]
			}
			return this.parent[this.parent.length - 1]
		}

		return this.parent[this.parent.length - 2]
	}

	getLast () {
		if (this.path.length === 1 && this.parent.length > 0) {
			return this.parent[this.parent.length - 1]
		}
		return this.path[this.path.length - 1]
	}

	setLast (element) {
		this.path[this.path.length - 1] = element

		const pathDepth = this.getDepth()
		if (pathDepth === 2) {
			this.isProcessingJsonProperty = element === 'data'
		} else if (pathDepth === 3) {
			this.isProcessingSubColumn = this.getSecondToLast() !== 'data'
			this.isProcessingJsonProperty = !this.isProcessingSubColumn
		}
	}

	slice (from, to) {
		return this.path.slice(from, to)
	}

	getDepth () {
		return this.path.length + this.parent.length
	}

	recalculateIsProcessingState () {
		const pathDepth = this.getDepth()
		this.isProcessingTable = pathDepth === 1
		this.isProcessingColumn = pathDepth === 2
		this.isProcessingSubColumn = pathDepth === 3 && this.getSecondToLast() !== 'data'

		const isData = pathDepth === 2 && this.getLast() === 'data'
		const isDataProperty = pathDepth === 3 && !this.isProcessingSubColumn
		this.isProcessingJsonProperty = isData || isDataProperty || pathDepth > 3
	}

	flattened () {
		const flatPath = new SqlPath()
		flatPath.path = this.parent.length > 0 ? _.concat(this.parent, this.slice(1)) : _.clone(this.path)

		return flatPath
	}

	toSql (options = {}) {
		const table = this.getTable()
		if (this.isProcessingColumn && this.getLast() === 'version') {
			return SqlPath.getVersionComputedField(table)
		}

		let operator = '#>'
		let start = ''
		let end = ''
		if (options.asText) {
			operator = '#>>'
			start = '('
			end = ')::text'
		}

		if (this.rootIsJson) {
			const selector = SqlPath.toJsonSelector(this.slice(1))

			return `${start}${table}${operator}${selector}${end}`
		}
		if (this.path.length === 1) {
			return `${start}${table}${end}`
		}
		const column = pgFormat.ident(this.path[1])
		if (this.path.length === 2) {
			return `${start}${table}.${column}${end}`
		}
		const selector = SqlPath.toJsonSelector(this.slice(2))

		return `${start}${table}.${column}${operator}${selector}${end}`
	}
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const BuilderContext = require('./builder-context')
const ExpressionFilter = require('./expression-filter')
const SqlPath = require('./sql-path')

/**
 * Map of properties to be selected, with support for conditional selects.
 */
module.exports = class SelectMap {
	/**
	 * Constructor.
	 *
	 * @param {Object} map - Recursive map of properties to be selected, where
	 *        `x: {}` means "select `x`".
	 */
	constructor (map) {
		// Save the pristine map to be used to create new `BranchMap`s
		this.map = map

		// Common stuff for all branches
		this.base = new BranchMap(map, this)

		// A list of branches for the property that `this` represents
		this.branches = []
	}

	/**
	 * Create a new branch and return it.
	 *
	 * @returns {BranchMap} The new branch.
	 */
	newBranch () {
		const branch = new BranchMap(this.map, this)
		this.branches.push(branch)

		return branch
	}

	/**
	 * Get the unconditional `additionalProperties` setting for this map.
	 *
	 * @returns {Boolean} The unconditional `additionalProperties` setting.
	 */
	getAdditionalProperties () {
		return this.base.getAdditionalProperties()
	}

	/**
	 * Set the unconditional `additionalProperties` setting for this map.
	 *
	 * @param {Boolean} schema - The unconditional `additionalProperties`
	 *        setting.
	 */
	setAdditionalProperties (schema) {
		this.base.setAdditionalProperties(schema)
	}

	/**
	 * Mark a property as seen. Unseen properties will be removed from the
	 * final payload if `additionalProperties` is false.
	 *
	 * @param {String} name - The name of the property to be marked as seen.
	 */
	see (name) {
		this.base.see(name)
	}

	/**
	 * Get a `SelectMap` for a property. This also marks `name` as seen.
	 *
	 * @param {String} name - The name of the property.
	 * @returns {SelectMap} The `SelectMap` corresponding for `name`.
	 */
	getProperty (name) {
		return this.base.getProperty(name)
	}

	/**
	 * Build an SQL expression yielding the JSONB card described by `this`.
	 *
	 * @param {String} table - The table the card is being selected from.
	 * @param {SqlPath} path - Internal.
	 * @param {ExpressionFilter} sunkFilter - Internal.
	 * @returns {String} The SQL expression.
	 */
	toSql (table, path = new SqlPath(), sunkFilter = new ExpressionFilter(true)) {
		// Start with the whole field if `additionalProperties` is true
		const field = path.toSql(table)
		const baseAdditionalProperties = this.base.getAdditionalProperties()
		const build = []
		if (baseAdditionalProperties) {
			build.push(`to_jsonb(${field})`)
		}

		// Find which properties we may need to explicitly add or replace. If
		// `additionalProperties` is true we rely on what properties all
		// branches have seen. Otherwise, it's just the properties that were
		// explicitly selected
		const allBranches = _.concat([ this.base ], this.branches)
		let explicitProperties = Object.keys(this.map)
		if (baseAdditionalProperties || explicitProperties.length === 0) {
			const allSeen = new Set()
			for (const branch of allBranches) {
				for (const seen of branch.seen) {
					allSeen.add(seen)
				}
			}

			if (!baseAdditionalProperties && path.isProcessingTable && !('links' in this.map)) {
				allSeen.delete('links')
			}

			explicitProperties = Array.from(allSeen)
		}

		// Create an object with all the properties that we need. For each
		// property, we start with the JSONB object that `this.base` yields for
		// that property, and then just replace with what the branches give us
		const isSubLinks = path.isProcessingColumn && path.getLast() === 'links'
		const args = []
		path.push(null)
		for (const name of explicitProperties) {
			// TODO: conditional selects through links is complicated T_T
			if (isSubLinks) {
				args.push(pgFormat.literal(name))
				args.push(`${BuilderContext.lateralAliasFor(name)}.linkedCards`)

				continue
			}

			path.setLast(name)

			/* Const subTable = isSubLinks
				? `${BuilderContext.lateralAliasFor(name)}.linkedCards`
				: table
			const subPath = isSubLinks ? new SqlPath() : path */

			const isValidLinks =
				path.isProcessingColumn &&
				name === 'links' &&
				(
					baseAdditionalProperties ||
					'links' in this.map
				)

			const force =

				// If `additionalProperties` is false we have to be explicit
				// about each selected field
				!baseAdditionalProperties ||

				// `<table>.links` always acts like
				// `additionalProperties = false`
				// isSubLinks ||

				// Links come from joins, so we allways have to be explicit
				// about them in SQL
				isValidLinks

			const alternatives = []
			for (const branch of this.branches) {
				const branchSql = branch.toSql(
					table,
					name,
					path,
					sunkFilter,
					force
				)
				if (branchSql !== null) {
					const filterSql = branch.filter.toSql(table)
					alternatives.push(`WHEN ${filterSql} THEN ${branchSql}`)
				}
			}

			const concat = []
			const baseSql = this.base.toSql(
				table,
				name,
				path,
				sunkFilter,
				force
			)
			if (baseSql !== null) {
				concat.push(baseSql)
			}

			if (alternatives.length > 0) {
				const defaultPayload = baseAdditionalProperties
					? `to_jsonb(${path.toSql(table)})`
					: '\'{}\'::jsonb'
				concat.push(`CASE ${alternatives.join('\n')} ELSE ${defaultPayload} END`)
			}

			if (concat.length > 0) {
				args.push(pgFormat.literal(name))
				args.push(concat.join(' || '))
			}
		}
		path.pop()
		if (args.length > 0) {
			build.push(`jsonb_build_object(${args.join(', ')})`)
		}

		if (build.length === 0) {
			return '\'{}\'::jsonb'
		}

		return build.join(' || ')
	}

	isTransitivelyFiltered () {
		if (this.base.isTransitivelyFiltered()) {
			return true
		}
		for (const branch of this.branches) {
			if (branch.isTransitivelyFiltered()) {
				return true
			}
		}

		return false
	}
}

const SelectMap = module.exports

/**
 * A single branch of a `SelectMap`.
 */
class BranchMap {
	constructor (map, parent) {
		// We need this for `this.newBranch()`
		this.parent = parent

		// Defaults to true as per the JSON schema spec
		this.additionalProperties = true

		// Map of all sub properties
		this.all = {}

		// The condition for all sub properties to be selected
		this.filter = new ExpressionFilter(true)

		// Set of sub properties we've seen, either from `getProperty()` or
		// `see()`
		this.seen = new Set()

		for (const [ key, value ] of Object.entries(map)) {
			this.all[key] = new SelectMap(value)
		}
	}

	/**
	 * Create a new branch from the parent `SelectMap` and return it.
	 *
	 * @returns {BranchMap} The new branch.
	 */
	newBranch () {
		return this.parent.newBranch()
	}

	/**
	 * Get this branch's `additionalProperties` setting.
	 *
	 * @returns {Boolean} This branch's `additionalProperties` setting.
	 */
	getAdditionalProperties () {
		return this.additionalProperties
	}

	/**
	 * Set this branch's `additionalProperties` setting for this map.
	 *
	 * @param {Boolean} schema - This branch's `additionalProperties` setting.
	 */
	setAdditionalProperties (schema) {
		this.additionalProperties = schema
	}

	/**
	 * Set the filter for this branch.
	 *
	 * @param {SqlFilter} filter - The filter.
	 */
	setFilter (filter) {
		this.filter = _.cloneDeep(filter).intoExpression()
	}

	/**
	 * Mark a property as seen. Unseen properties will be removed from the
	 * final payload if `additionalProperties` is false.
	 *
	 * @param {String} name - The name of the property to be marked as seen.
	 */
	see (name) {
		this.seen.add(name)
		if (!(name in this.all)) {
			this.all[name] = new SelectMap({})
		}
	}

	/**
	 * Get a `SelectMap` for a property. This also marks `name` as seen.
	 *
	 * @param {String} name - The name of the property.
	 * @returns {SelectMap} The `SelectMap` corresponding for `name`.
	 */
	getProperty (name) {
		this.see(name)

		return this.all[name]
	}

	getExcluded (from) {
		if (this.additionalProperties) {
			return []
		}

		const seen = this.seen

		return _.filter(from, (name) => {
			return !seen.has(name)
		})
	}

	// TODO: avoiding recursion with a cache would save some repeated
	// calculations
	isTransitivelyFiltered () {
		if (!this.additionalProperties) {
			return true
		}
		for (const subProperty of Object.values(this.all)) {
			if (subProperty.isTransitivelyFiltered()) {
				return true
			}
		}

		return false
	}

	toSql (table, name, path, sunkFilter, force) {
		if (!this.seen.has(name)) {
			return null
		}

		const subSelectMap = this.all[name]
		if (!force && !subSelectMap.isTransitivelyFiltered()) {
			return null
		}

		return subSelectMap.toSql(
			table,
			path,
			_.cloneDeep(sunkFilter).and(_.cloneDeep(this.filter))
		)
	}
}

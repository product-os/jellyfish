/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const ExpressionFilter = require('./expression-filter')
const SqlPath = require('./sql-path')

/**
 * Map of properties to be selected, with support for conditional selects.
 */
module.exports = class SelectMap {
	static lateralAliasFor (linkType) {
		return pgFormat.ident(`linked@/${linkType}`)
	}

	/**
	 * Constructor.
	 *
	 * @param {Object} map - Recursive map of properties to be selected, where
	 *        `x: {}` means "select `x`".
	 * @param {Object} links - Internal.
	 * @param {SqlPath} path - Internal.
	 */
	constructor (map, links = {}, path = new SqlPath()) {
		// Save the pristine map to be used to create new `BranchMap`s
		this.map = map

		// Map of link types to the `SelectMap` of that link
		this.links = links

		// What column/property this `SelectMap` refers to
		this.path = path

		// Whether this `SelectMap` represents the `links` root property
		this.isLinks = path.isProcessingColumn && path.getLast() === 'links'

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
	 * Get a `SelectMap` for a link.
	 *
	 * @param {String} linkType - The link's link type.
	 * @returns {SelectMap} The `SelectMap` corresponding to the `linkType`
	 *          link.
	 */
	getLink (linkType) {
		if (linkType in this.links) {
			return this.links[linkType]
		}

		const linkSelectMap = new SelectMap(this.map)
		this.links[linkType] = linkSelectMap

		return linkSelectMap
	}

	/**
	 * Build an SQL expression yielding the JSONB card described by `this`.
	 *
	 * @param {String} table - The table the card is being selected from.
	 * @returns {String} The SQL expression.
	 */
	toSql (table) {
		// The idea here is conceptually simple: the SQL expression this method
		// returns will yield a JSONB object containing exactly the properties
		// asked. The question is, what properties are those? There are three
		// parameters that influence that:
		//
		// - `this.map`, given in the constructor, denoting explicitly selected
		//   properties
		// - The value of `additionalProperties`
		// - The list of "seen" properties. These are the properties actually
		//   present in the schema
		//
		// Every `SelectMap` is composed of a base `BranchMap`, and zero or
		// more branching `BranchMap`. All of these have their own
		// `additionalProperties` value and list of seen properties.
		// `BranchMap`s also have an filter, although that is unused for the
		// base. At a high level, the object that the SQL expression yields is:
		//
		// ```
		// IF branch1.filter evaluates to true THEN
		//   yield the union of base and branch1
		// ELSE IF branch2.filter evaluates to true THEN
		//   yield the union of base and branch1
		// ...
		// ELSE
		//   yield base
		// END
		// ```
		//
		// The list properties implied by each `BranchMap` is as follows:
		//
		// - If `additionalProperties` is true or `this.map` is empty, then all
		//   properties are selected
		// - Otherwise, then:
		//   - If base, all properties in `this.map`
		//   - All properties seen by this `BranchMap`

		// Build a list of all properties we need to select in the most general
		// case. This can be `true` to denote that we want *all* properties
		const explicitProperties = Object.keys(this.map)
		let selectedProperties = true
		if (!this.base.getAdditionalProperties()) {
			if (explicitProperties.length > 0) {
				selectedProperties = explicitProperties
			} else {
				selectedProperties = Array.from(this.base.seen)
			}
		}

		// Build a list of branches that are going to influence the final set
		// of properties that are actually selected
		const conditionalBranches = this.branches
			.filter((branch) => {
				// Branches that are unconditional do not influence what we
				// select
				return branch.isTransitivelyConditional()
			})
			.map((branch) => {
				const properties = Array.from(branch.seen)

				const transitivelyConditional = []
				for (const [ property, selectMap ] of Object.entries(branch.all)) {
					if (selectMap.isTransitivelyConditional()) {
						transitivelyConditional.push(property)
					}
				}

				return {
					branch,
					properties,
					transitivelyConditional
				}
			})

		// We start off with the greatest common set of properties we can
		// return
		let head = selectedProperties
		for (const data of conditionalBranches) {
			if (!data.branch.getAdditionalProperties()) {
				if (head === true) {
					head = data.properties
				} else {
					head = _.intersection(head, data.properties)
				}
			}
		}

		// Then for each branch we add all relevant properties conditioned to
		// the branch's filter
		const conditionalCases = []
		for (const data of conditionalBranches) {
			let addedProperties = []
			if (head !== true) {
				addedProperties = _.difference(data.properties, head)
			}
			const branchProperties = _.union(
				addedProperties,
				data.transitivelyConditional
			)

			conditionalCases.push(data.branch.toConditionalJsonbFragment(
				table,
				branchProperties
			))
		}

		// Get the properties we need to include in the `ELSE` clause if it
		// exists
		let tail = []
		if (conditionalCases.length > 0 && head !== true) {
			if (selectedProperties === true) {
				tail = true
			} else {
				tail = _.difference(selectedProperties, head)
			}
		}

		// Also build a list of `this.base` properties that are conditional, as
		// we need this in a couple of places
		const baseConditionalProperties = []
		for (const [ property, selectMap ] of Object.entries(this.base.all)) {
			if (selectMap.isTransitivelyConditional()) {
				baseConditionalProperties.push(property)
			}
		}

		// We always treat the `version` and `links` columns as if they were
		// conditional, so they will be built explicitly. Both are computed
		// properties
		if (this.path.isProcessingTable) {
			if (
				(selectedProperties === true || 'links' in selectedProperties) &&
				!('links' in baseConditionalProperties) &&
				!_.isEmpty(this.links)
			) {
				baseConditionalProperties.push('links')
			}

			if (
				(selectedProperties === true || 'version' in selectedProperties) &&
				!('version' in baseConditionalProperties)
			) {
				baseConditionalProperties.push('version')
			}
		}

		// Finally, build the SQL expression

		const build = []

		if (head === true) {
			build.push(`to_jsonb(${this.path.toSql(table)})`)

			if (baseConditionalProperties.length > 0) {
				build.push(this.sqlBuildJsonbFor(baseConditionalProperties, table))
			}
		} else {
			build.push(this.sqlBuildJsonbFor(head, table))
		}

		if (conditionalCases.length > 0) {
			let sqlTail = null
			if (tail === true) {
				sqlTail = [ `to_jsonb(${this.path.toSql(table)})` ]

				if (baseConditionalProperties.length > 0) {
					sqlTail.push(this.sqlBuildJsonbFor(baseConditionalProperties, table))
				}

				sqlTail = sqlTail.join(' || ')
			} else if (tail.length > 0) {
				sqlTail = this.sqlBuildJsonbFor(tail, table)
			}

			// Aggregate all conditional cases in a binary-tree-like structure
			// so that they can be merged with the least amount of calls to
			// `merge_jsonb_views`
			let mergeTree = conditionalCases
			while (mergeTree.length > 1) {
				const newMergeTree = []
				for (let idx = 0; idx < mergeTree.length; idx += 2) {
					if (idx === mergeTree.length - 1) {
						newMergeTree.push(mergeTree[idx])
					} else {
						newMergeTree.push(`merge_jsonb_views(${mergeTree[idx]}, ${mergeTree[idx + 1]})`)
					}
				}
				mergeTree = newMergeTree
			}

			let body = mergeTree[0]
			if (sqlTail !== null) {
				const tailFilter = new ExpressionFilter(false)
				for (const branch of this.branches) {
					if (!branch.isTransitivelyConditional()) {
						tailFilter.or(_.cloneDeep(branch.filter))
					}
				}
				body = `
					CASE
						WHEN ${tailFilter.toSql(table)} THEN ${sqlTail}
						ELSE ${body}
					END
				`
			}

			build.push(body)
		}

		return build.join(' || ')
	}

	sqlBuildJsonbFor (properties, table) {
		const args = []
		const propertiesAsLiterals = []
		this.path.push(null)
		for (const property of properties) {
			this.path.setLast(property)

			const literal = pgFormat.literal(property)
			propertiesAsLiterals.push(literal)
			args.push(literal)

			if (this.path.isProcessingColumn && property === 'links') {
				const linkArgs = []
				for (const linkType of Object.keys(this.links)) {
					linkArgs.push(pgFormat.literal(linkType))
					linkArgs.push(SelectMap.lateralAliasFor(linkType))
				}
				args.push(`jsonb_build_object(${linkArgs.join(', ')})`)
			} else if (property in this.base.all) {
				args.push(this.base.all[property].toSql(table))
			} else {
				args.push(this.path.toSql(table))
			}
		}
		this.path.pop()

		const jsonbObject = `jsonb_build_object(${args.join(', ')})`
		if (this.path.isProcessingJsonProperty) {
			return `${jsonbObject} - array(
				SELECT key
				FROM (VALUES (${propertiesAsLiterals.join('), (')})) AS f1(key)
				WHERE key NOT IN (SELECT jsonb_object_keys(${this.path.toSql(table)}))
			)`
		}
		return jsonbObject
	}

	isTransitivelyConditional () {
		if (this.base.isTransitivelyConditional()) {
			return true
		}
		for (const branch of this.branches) {
			if (branch.isTransitivelyConditional()) {
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

		const path = this.parent.path
		const links = this.parent.links
		for (const [ key, value ] of Object.entries(map)) {
			if (this.parent.isLinks && !(key in links)) {
				links[key] = new SelectMap(value)
			} else {
				const subPath = _.cloneDeep(path)
				subPath.push(key)
				this.all[key] = new SelectMap(value, links, subPath)
			}
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

		const links = this.parent.links
		if (this.parent.isLinks) {
			if (!(name in links)) {
				links[name] = new SelectMap({})
			}
		} else if (!(name in this.all)) {
			const subPath = _.cloneDeep(this.parent.path)
			subPath.push(name)
			this.all[name] = new SelectMap({}, links, subPath)
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

		if (this.parent.isLinks) {
			return this.parent.links[name]
		}

		return this.all[name]
	}

	/**
	 * Get a `SelectMap` for a link.
	 *
	 * @param {String} linkType - The link's link type.
	 * @returns {SelectMap} The `SelectMap` corresponding to the `linkType`
	 *          link.
	 */
	getLink (linkType) {
		return this.parent.getLink(linkType)
	}

	// TODO: avoiding recursion with a cache would save some repeated
	// calculations
	isTransitivelyConditional () {
		if (!this.additionalProperties) {
			return true
		}
		for (const subProperty of Object.values(this.all)) {
			if (subProperty.isTransitivelyConditional()) {
				return true
			}
		}

		return false
	}

	toConditionalJsonbFragment (table, wantedProperties) {
		const propertiesAsLiterals = []
		const args = []
		const path = this.parent.path
		path.push(null)
		for (const property of wantedProperties) {
			const literal = pgFormat.literal(property)
			propertiesAsLiterals.push(literal)
			args.push(literal)

			path.setLast(property)
			if (property in this.all) {
				args.push(this.all[property].toSql(table))
			} else {
				args.push(path.toSql(table))
			}
		}
		path.pop()

		let jsonbObject = `jsonb_build_object(${args.join(', ')})`
		if (path.isProcessingJsonProperty) {
			jsonbObject = `${jsonbObject} - array(
				SELECT key
				FROM (VALUES (${propertiesAsLiterals.join('), (')})) AS f1(key)
				WHERE key NOT IN (SELECT jsonb_object_keys(${path.toSql(table)}))
			)`
		}

		return `
			CASE
				WHEN ${this.filter.toSql(table)} THEN ${jsonbObject}
				ELSE '{}'::jsonb
			END
		`
	}
}

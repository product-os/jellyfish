/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BuilderContext = require('./builder-context.js')

/**
 * Builder for any kind of SQL fragment.
 */
module.exports = class SqlFragmentBuilder {
	constructor (tableOrContext) {
		this.context = tableOrContext instanceof BuilderContext
			? tableOrContext
			: new BuilderContext(tableOrContext)
		this.expr = ''
	}

	getTable () {
		return this.context.getTable()
	}

	getContext () {
		return this.context
	}

	push (fragment) {
		this.expr += fragment

		return this
	}

	pushParenthised (fragment) {
		this.expr += `(${fragment})`

		return this
	}

	pushList (fragments) {
		for (const [ idx, fragment ] of fragments.entries()) {
			if (idx > 0) {
				this.expr += ', '
			}
			this.expr += fragment
		}

		return this
	}

	pushParenthisedList (fragments) {
		this.expr += '('
		this.pushList(fragments)
		this.expr += ')'

		return this
	}

	pushCasted (fragment, cast) {
		this.expr += `(${fragment})::${cast}`

		return this
	}

	pushSpaced (fragment) {
		this.expr += ` ${fragment} `

		return this
	}

	pushInvoked (functionName, argument) {
		this.expr += `${functionName}(${argument})`

		return this
	}

	extendFrom (other) {
		other.toSqlInto(this)

		return this
	}

	extendParenthisedFrom (other) {
		this.expr += '('
		other.toSqlInto(this)
		this.expr += ')'

		return this
	}

	toSql () {
		return this.expr
	}

	toSqlInto (builder) {
		builder.push(this.expr)
	}
}

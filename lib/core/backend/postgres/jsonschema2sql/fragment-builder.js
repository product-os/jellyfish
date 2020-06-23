/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/**
 * Builder for any kind of SQL fragment.
 */
module.exports = class SqlFragmentBuilder {
	constructor () {
		this.expr = ''
	}

	push (fragment) {
		this.expr += fragment
	}

	pushParenthised (fragment) {
		this.expr += `(${fragment})`
	}

	pushList (fragments) {
		for (const [ idx, fragment ] of fragments.entries()) {
			if (idx > 0) {
				this.expr += ', '
			}
			this.expr += fragment
		}
	}

	pushParenthisedList (fragments) {
		this.expr += '('
		this.pushList(fragments)
		this.expr += ')'
	}

	pushCasted (fragment, cast) {
		this.expr += `(${fragment})::${cast}`
	}

	pushSpaced (fragment) {
		this.expr += ` ${fragment} `
	}

	pushInvoked (functionName, argument) {
		this.expr += `${functionName}(${argument})`
	}

	build () {
		return this.expr
	}
}

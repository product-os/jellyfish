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
		this.expr = []
	}

	push (fragment) {
		this.expr.push(fragment)
	}

	pushParenthised (fragment) {
		this.expr.push(...[
			'(',
			fragment,
			')'
		])
	}

	pushList (fragments) {
		for (const [ idx, fragment ] of fragments.entries()) {
			if (idx > 0) {
				this.expr.push(', ')
			}
			this.expr.push(fragment)
		}
	}

	pushParenthisedList (fragments) {
		this.expr.push('(')
		this.pushList(fragments)
		this.expr.push(')')
	}

	pushCasted (fragment, cast) {
		this.expr.push(...[
			'(',
			fragment,
			')',
			'::',
			cast
		])
	}

	pushSpaced (fragment) {
		this.expr.push(...[
			' ',
			fragment,
			' '
		])
	}

	pushInvoked (functionName, argument) {
		this.expr.push(...[
			functionName,
			'(',
			argument,
			')'
		])
	}

	build () {
		return this.expr.join('')
	}
}

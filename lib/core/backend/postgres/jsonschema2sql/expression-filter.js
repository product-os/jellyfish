/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const NotFilter = require('./not-filter')
const SqlFilter = require('./sql-filter')

// Supported logical binary operators
const AND = 0
const OR = 1

// Rules for constant folding
const CONSTANT_FOLD = {}
CONSTANT_FOLD[AND] = {
	true: (other) => {
		return other
	},
	false: _.constant(false)
}
CONSTANT_FOLD[OR] = {
	true: _.constant(true),
	false: (other) => {
		return other
	}
}

/**
 * Filter asserting that a logical expression is true.
 *
 * Note that all logical combinators (`and`, `or`, `implies`) assume they own
 * their arguments and are free to use/modify them as they please.
 */
module.exports = class ExpressionFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {any} initialValue - Initial constant value.
	 */
	constructor (initialValue) {
		super()

		this.operator = AND
		this.expr = [ initialValue ]
	}

	intoExpression () {
		return this
	}

	/**
	 * Negate the whole expression.
	 *
	 * @returns {ExpressionFilter} `this`.
	 */
	negate () {
		// To avoid copying and to make sure `this` references the right
		// expression, we move our internal state into a new `ExpressionFilter`
		// and give that to the `NotFilter` instead of `this`

		const inner = new ExpressionFilter()
		inner.operator = this.operator
		inner.expr = this.expr

		this.operator = AND
		this.expr = [ new NotFilter(inner) ]

		return this
	}

	/**
	 * Perform a logical conjunction with another filter. This method assumes
	 * ownership of its argument.
	 *
	 * @param {SqlFilter} other - Filter `this` will be ANDed with.
	 * @returns {ExpressionFilter} `this`.
	 */
	and (other) {
		this.applyBinaryOperator(AND, other)

		return this
	}

	/**
	 * Perform a logical disjunction with another filter. This method assumes
	 * ownership of its argument.
	 *
	 * @param {SqlFilter} other - Filter `this` will be ORed with.
	 * @returns {ExpressionFilter} `this`.
	 */
	or (other) {
		this.applyBinaryOperator(OR, other)

		return this
	}

	applyBinaryOperator (operator, other) {
		const otherIsExpression = other instanceof ExpressionFilter
		if (this.tryConstantFolding(operator, other, otherIsExpression)) {
			return
		}

		// Do not nest if we can avoid it

		const inlineThis = this.operator === operator || this.expr.length === 1
		const inlineOther = otherIsExpression && (other.operator === operator || other.expr.length === 1)

		if (!inlineThis) {
			const grouped = new ExpressionFilter()
			grouped.operator = this.operator
			grouped.expr = this.expr
			this.expr = [ grouped ]
		}

		this.operator = operator

		if (inlineOther) {
			this.expr.push(...other.expr)
		} else {
			this.expr.push(other)
		}
	}

	// If applicable, fold constants to simplify the resulting SQL
	tryConstantFolding (operator, other, otherIsExpression) {
		let folded = null
		let foldOperator = false
		if (this.expr.length === 1 && _.isBoolean(this.expr[0])) {
			folded = CONSTANT_FOLD[operator][this.expr[0]](other)
			foldOperator = true
		} else if (otherIsExpression && other.expr.length === 1 && _.isBoolean(other.expr[0])) {
			folded = CONSTANT_FOLD[operator][other.expr[0]](this)
		}
		if (folded === null) {
			return false
		}

		if (folded instanceof ExpressionFilter) {
			if (foldOperator) {
				this.operator = folded.operator
			}
			this.expr = folded.expr
		} else {
			this.expr = [ folded ]
		}

		return true
	}

	/**
	 * Performs a material conditional: `this -> implicant`. This method
	 * assumes ownership of its argument.
	 *
	 * @param {SqlFilter} implicant - The filter that `this` will imply.
	 * @returns {ExpressionFilter} `this`.
	 */
	implies (implicant) {
		return this.negate().or(implicant)
	}

	/**
	 * Make `this` always evaluate to false.
	 *
	 * @returns {ExpressionFilter} `this`.
	 */
	makeUnsatisfiable () {
		this.op = AND
		this.expr = [ false ]

		return this
	}

	/**
	 * Check if `this` always evaluates to false. Note that this check is
	 * actually NP-complete, so this method only evaluates to true either if
	 * `this` was constructed with an initial value of `false`, or if
	 * `this.makeUnsatisfiable()` was called before this method.
	 *
	 * @returns {Boolean} Whether `this` is unsatisfiable.
	 */
	isUnsatisfiable () {
		return this.expr.length === 1 && this.expr[0] === false
	}

	toSqlInto (builder) {
		const operator = this.operator === AND ? ' AND ' : ' OR '
		if (this.expr.length > 1) {
			builder.push('(')
		}
		for (const [ idx, filter ] of this.expr.entries()) {
			if (idx > 0) {
				builder.push(operator)
			}

			if (filter === true) {
				builder.push('true')
			} else if (filter === false) {
				builder.push('false')
			} else {
				filter.toSqlInto(builder)
			}
		}
		if (this.expr.length > 1) {
			builder.push(')')
		}
	}
}

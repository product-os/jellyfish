/* eslint-disable no-underscore-dangle */
/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */

const AliasExpression = require('./alias-expression')
const ConstantExpression = require('./constant-expression')
const FieldExpression = require('./field-expression')
const FromExpression = require('./from-expression')
const FunctionExpression = require('./function-expression')
const SelectExpression = require('./select-expression')
const InfixExpression = require('./infix-expression')
const FilterExpression = require('./filter-expression')

// Query Builder
//
// The query builder uses a stack-based approach to building queries.  It is
// very simple and does no query validation.  It is not consumed directly, but
// via the `CardQueryBuilder` which closes the abstraction distance between SQL
// and Cards.
//
// Example:
//
//     > const builder = new Builder()
//     > builder.field('id')
//     > builder.field('version_major')
//     > builder.const('1')
//     > builder.function('coalesce', 2)
//     > builder.as('version')
//     > builder.from('cards')
//     > builder.select()
//     > builder.toQuery()
//     "SELECT id, coalesce(version_major, '1') AS version FROM cards"
//
module.exports = class QueryBuilder {
	constructor () {
		this.expressions = []
	}

	// Push a "FROM <tableName>" onto the stack.
	from (tableName) {
		this.expressions.push(new FromExpression(tableName))
		return this
	}

	// Push a "<fieldName>" onto the stack.
	field (fieldName) {
		this.expressions.push(new FieldExpression(fieldName))
		return this
	}

	// Push a constant value onto the stack.
	constant (value) {
		this.expressions.push(new ConstantExpression(value))
		return this
	}

	// Pop the top value off the stack and replace it with an alias.
	as (alias) {
		this._assertAtLeast(1)

		this.expressions.push(new AliasExpression(this.expressions.pop(), alias))
		return this
	}

	// Pop `argc` values off the stack and replace them with a function called
	// `name` which contains the previous stack values as arguments.
	function (name, argc) {
		this._assertAtLeast(argc)

		const args = []

		// Move the arguments off the stack and into the function.
		// Note the reversal of ordering.
		for (let idx = 0; idx < argc; idx++) {
			args.unshift(this.expressions.pop())
		}

		this.expressions.push(new FunctionExpression(name, args))
		return this
	}

	// Pop `argc` values off the stack and replace then with a select.
	//
	// Defaults to all values on the stack if `argc` is not specified.
	select (argc = null) {
		let expressions = []

		if (argc) {
			this._assertAtLeast(argc)

			for (let idx = 0; idx < this.expressions.length; idx++) {
				expressions.push(this.expressions.pop())
			}
		} else {
			this._assertAtLeast(1)

			expressions = this.expressions
		}

		this.expressions = [ new SelectExpression(expressions) ]

		return this
	}

	eq () {
		const rhs = this.expressions.pop()
		const lhs = this.expressions.pop()
		this.expressions.push(new InfixExpression('=', lhs, rhs))
	}

	and () {
		const rhs = this.expressions.pop()
		const lhs = this.expressions.pop()
		this.expressions.push(new InfixExpression('AND', lhs, rhs))
	}

	or () {
		const rhs = this.expressions.pop()
		const lhs = this.expressions.pop()
		this.expressions.push(new InfixExpression('OR', lhs, rhs))
	}

	where () {
		this.expressions.push(new FilterExpression(this.expressions.pop()))
	}

	// Convert the top expression on the stack into a SQL query.
	toQuery () {
		this._assertAtLeast(1)

		return this.expressions[0].toQuery()
	}

	_assertAtLeast (number) {
		if (this.expressions.length < number) {
			throw new Error(`Expected expression stack to contain at least ${number} values.`)
		}
	}
}

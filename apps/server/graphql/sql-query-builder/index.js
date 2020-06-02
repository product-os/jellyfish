/* eslint-disable no-underscore-dangle */
/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */

const AliasExpression = require('./alias-expression')
const CastExpression = require('./cast-expression')
const ConstantExpression = require('./constant-expression')
const FieldExpression = require('./field-expression')
const FromExpression = require('./from-expression')
const FunctionExpression = require('./function-expression')
const SelectExpression = require('./select-expression')
const InfixExpression = require('./infix-expression')
const FilterExpression = require('./filter-expression')
const TableExpression = require('./table-expression')
const JoinExpression = require('./join-expression')
const JsonPathExpression = require('./json-path-expression')

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
//     > builder.table('cards')
//     > builder.from()
//     > builder.select()
//     > builder.formatAsSql()
//     "SELECT id, coalesce(version_major, '1') AS version FROM cards"
//
module.exports = class QueryBuilder {
	constructor () {
		this.expressions = []
	}

	cast (typeName) {
		this._assertAtLeast(1)
		this.expressions.push(new CastExpression(this.expressions.pop(), typeName))
		return this
	}

	// Push a named table onto the stack.
	table (tableName) {
		this.expressions.push(new TableExpression(tableName))
		return this
	}

	// Push a from expression onto the stack.
	//
	// Pops the top `argc` expressions off the stack and uses them as arguments.
	// `argc` defaults to 1.
	from (argc = 1) {
		const expressions = []
		for (let idx = 0; idx < argc; idx++) {
			expressions.unshift(this.expressions.pop())
		}

		this.expressions.push(new FromExpression(expressions))
		return this
	}

	// Push a fieldName onto the stack.
	field (fieldName) {
		this.expressions.push(new FieldExpression(fieldName))
		return this
	}

	fieldFrom (from, fieldName) {
		this.expressions.push(new FieldExpression(fieldName, from))
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

	// Take the contents of the stack and replace them with a select expression
	// containing the previous values.
	select () {
		this._assertAtLeast(1)
		this.expressions = [ new SelectExpression(this.expressions) ]
		return this
	}

	infix (operator) {
		this._assertAtLeast(2)
		const rhs = this.expressions.pop()
		const lhs = this.expressions.pop()
		this.expressions.push(new InfixExpression(operator, lhs, rhs))
		return this
	}

	eq () {
		return this.infix('=')
	}

	and () {
		return this.infix('AND')
	}

	or () {
		return this.infix('OR')
	}

	jsonPath (path) {
		this._assertAtLeast(1)
		this.expressions.push(new JsonPathExpression(this.expressions.pop(), path))
		return this
	}

	where () {
		this._assertAtLeast(1)
		this.expressions.push(new FilterExpression(this.expressions.pop()))
		return this
	}

	join () {
		this._assertAtLeast(2)
		const on = this.expressions.pop()
		const table = this.expressions.pop()
		this.expressions.push(new JoinExpression(table, on))
		return this
	}

	leftJoin () {
		this._assertAtLeast(2)
		const on = this.expressions.pop()
		const table = this.expressions.pop()
		this.expressions.push(new JoinExpression(table, on, 'LEFT'))
		return this
	}

	// Destructively deplete another builder object by moving it's expressions
	// into this builder.
	append (otherBuilder) {
		const len = otherBuilder.expressions.length
		for (let idx = 0; idx < len; idx++) {
			this.expressions.push(otherBuilder.expressions.shift())
		}
		return this
	}

	// Convert the top expression on the stack into a SQL query.
	formatAsSql () {
		this._assertAtLeast(1)

		return this.expressions[0].formatAsSql()
	}

	_assertAtLeast (number) {
		if (this.expressions.length < number) {
			console.dir(this.expressions, {
				depth: null
			})
			throw new Error(`Expected expression stack to contain at least ${number} values.`)
		}
	}
}

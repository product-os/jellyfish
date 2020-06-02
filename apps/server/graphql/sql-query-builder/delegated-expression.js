const Expression = require('./expression')

const getDelegate = function () {
	let delegateName = this.delegatesTo

	if (typeof (this.delegatesTo) === 'function') {
		delegateName = this.delegatesTo()
	}

	return this[delegateName]
}

// A wrapper around Expression that delegates the `is*` checks to an inner
// expression.
module.exports = class DelegatedExpression extends Expression {
	constructor (delegatesTo) {
		super()
		this.delegatesTo = delegatesTo
	}

	isSelectable () {
		return Reflect.apply(getDelegate, this, []).isSelectable()
	}

	isQueryable () {
		return Reflect.apply(getDelegate, this, []).isQueryable()
	}

	isFilter () {
		return Reflect.apply(getDelegate, this, []).isFilter()
	}

	isField () {
		return Reflect.apply(getDelegate, this, []).isField()
	}

	isFrom () {
		return Reflect.apply(getDelegate, this, []).isFrom()
	}
}

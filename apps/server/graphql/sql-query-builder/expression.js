/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */

module.exports = class Expression {
	isSelectable () {
		return false
	}

	isQueryable () {
		return false
	}

	isFilter () {
		return false
	}

	isField () {
		return false
	}

	isFrom () {
		return false
	}

	isJoin () {
		return false
	}

	formatAsSql (_wrap) {
		throw new Error('Expressions must implement formatAsSql')
	}
}

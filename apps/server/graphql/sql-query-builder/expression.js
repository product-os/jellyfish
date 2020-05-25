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

	toQuery () {
		throw new Error('Expressions must implement toQuery')
	}
}

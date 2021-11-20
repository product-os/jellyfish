const _ = require('lodash')

/**
 * @summary Check if a value is a non-empty string
 * @function
 *
 * @param {String} value - value to check
 * @returns {Boolean} boolean dnoting if provided string is valid or not
 *
 * @example
 * if (exports.isValidString('test')) {
 *   console.log('Is a valid string')
 * }
 */
exports.isValidString = (value) => {
	if (_.isString(value) && !_.isEmpty(value)) {
		return true
	}
	return false
}

/**
 * @summary Handle errors
 * @function
 *
 * @param {String} msg - error message
 */
exports.handleError = (msg) => {
	console.error(msg)
	process.exit(1)
}

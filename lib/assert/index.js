/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

const createError = (context, error, messageOrFunction, options = {}) => {
	const message = _.isFunction(messageOrFunction) ? messageOrFunction() : messageOrFunction

	// eslint-disable-next-line new-cap
	const instance = new error(message)
	instance.context = context

	if (options.expected) {
		instance.expected = true
	}

	return instance
}

exports.USER = (context, expression, error, messageOrFunction) => {
	if (expression) {
		return
	}

	throw createError(context, error, messageOrFunction, {
		expected: true
	})
}

exports.INTERNAL = (context, expression, error, messageOrFunction) => {
	if (expression) {
		return
	}

	throw createError(context, error, messageOrFunction, {
		expected: false
	})
}

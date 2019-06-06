/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const createError = (context, error, message, options = {}) => {
	// eslint-disable-next-line new-cap
	const instance = new error(message)
	instance.context = context

	if (options.expected) {
		instance.expected = true
	}

	return instance
}

exports.USER = (context, expression, error, message) => {
	if (expression) {
		return
	}

	throw createError(context, error, message, {
		expected: true
	})
}

exports.INTERNAL = (context, expression, error, message) => {
	if (expression) {
		return
	}

	throw createError(context, error, message, {
		expected: false
	})
}

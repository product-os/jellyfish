/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

exports.AuthenticationError = class AuthenticationError extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'AuthenticationError'
		this.context = context
		this.expected = true
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

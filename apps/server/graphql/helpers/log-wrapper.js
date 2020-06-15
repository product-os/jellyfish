/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// This is just a wrapper around the logger/context combo so that I don't have
// to pass `context` to everything, especially given the fact that there would
// be multiple objects with the name "context" floating around the system.

module.exports = class LogWrapper {
	constructor (logger, context) {
		this.logger = logger
		this.context = context
	}

	debug (message, data) {
		this.logger.debug(this.context, message, data)
	}
	error (message, data) {
		this.logger.error(this.context, message, data)
	}
	info (message, data) {
		this.logger.info(this.context, message, data)
	}
	warn (message, data) {
		this.logger.warn(this.context, message, data)
	}
}

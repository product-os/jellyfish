/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Sentry from '@sentry/browser'

export default class Reporter {
	constructor ({
		version,
		dsn,
		isProduction
	}) {
		this.config = {
			version,
			dsn,
			isProduction
		}
		this.initialized = false
		this.reportException = this.reportException.bind(this)
		if (this.config.isProduction && this.config.dsn !== '0') {
			Sentry.init({
				dsn: this.config.dsn,
				release: this.config.version,
				environment: 'ui'
			})
			this.initialized = true
		}
	}

	setUser (user) {
		if (this.initialized) {
			Sentry.configureScope((scope) => {
				scope.setUser(user)
			})
		}
	}

	reportException (error, errorInfo) {
		if (this.initialized) {
			Sentry.withScope((scope) => {
				scope.setExtra(errorInfo)
				Sentry.captureException(error)
			})
		}
	}
}

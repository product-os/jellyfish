/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Sentry = require('@sentry/node')
const environment = require('../environment')
const packageJSON = require('../../package.json')

class Reporter {
	constructor () {
		this.initialized = false
		this.install = true
		this.reportException = this.reportException.bind(this)
	}

	reportException (context, error) {
		if (error.expected) {
			return
		}

		if (!this.initialized) {
			if (!this.install) {
				return
			}

			if (environment.sentry.server.dsn) {
				Sentry.init({
					dsn: environment.sentry.server.dsn,
					environment: 'server',

					// So that it matches git tags
					release: `v${packageJSON.version}`
				})

				this.initialized = true
			}

			this.install = false
		}

		if (this.initialized) {
			error.context = context
			Sentry.captureException(error)
		}
	}
}

module.exports = new Reporter()

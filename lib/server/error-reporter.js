/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Sentry = require('@sentry/node')
const logger = require('../logger').getLogger(__filename)
const environment = require('../environment')
const packageJSON = require('../../package.json')

class Reporter {
	constructor () {
		if (environment.isProduction()) {
			if (process.env.SENTRY_DSN_SERVER) {
				Sentry.init({
					dsn: process.env.SENTRY_DSN_SERVER,
					release: packageJSON.version,
					environment: 'server'
				})

				this.initialized = true
				logger.info(null, 'Sentry error reporter initialized')
			} else {
				logger.warn(null, 'Skipping Sentry setup')
			}
		} else {
			logger.info(null, 'Skipping Sentry setup as environment is not production')
		}

		this.reportException = this.reportException.bind(this)
	}

	reportException (error) {
		if (!this.initialized) {
			return
		}

		Sentry.captureException(error)
	}
}

module.exports = new Reporter()

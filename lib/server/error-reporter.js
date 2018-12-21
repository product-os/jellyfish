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

const Raven = require('raven')
const logger = require('../logger').getLogger(__filename)

class Reporter {
	constructor () {
		if (process.env.NODE_ENV === 'production') {
			if (process.env.SENTRY_DSN_SERVER) {
				Raven.config(process.env.SENTRY_DSN_SERVER).install()
				this.initialized = true
				logger.info(null, 'Raven error reporter initialized')
			} else {
				logger.warn(null, 'No SENTRY_DSN environment variable provided: skipping Raven setup')
			}
		} else {
			logger.info(null, 'NODE_ENV environment variable is not "production": skipping Raven setup')
		}

		this.reportException = this.reportException.bind(this)
	}

	reportException (error) {
		logger.error('Reporting server exception', {
			error: {
				message: error.message,
				name: error.name,
				stack: error.stack
			}
		})

		if (!this.initialized) {
			return
		}

		Raven.captureException(error)
	}
}

module.exports = new Reporter()

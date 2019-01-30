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

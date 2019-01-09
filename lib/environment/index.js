/*
 * Copyright 2019 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @summary Check if the code is running in a production environment
 * @function
 * @public
 *
 * @returns {Boolean} Whether the environment is production
 *
 * @example
 * if (environment.isProduction()) {
 *   console.log('Production!')
 * }
 */
exports.isProduction = () => {
	return process.env.NODE_ENV === 'production'
}

/**
 * @summary Get the log level
 * @function
 * @public
 *
 * @returns {String} log level
 *
 * @example
 * console.log(environment.getLogLevel())
 */
exports.getLogLevel = () => {
	return process.env.LOGLEVEL || 'debug'
}

/**
 * @summary Get the token of an integration
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @returns {(Any|Null)} token
 *
 * @example
 * console.log(environment.getIntegrationToken('github'))
 */
exports.getIntegrationToken = (integration) => {
	if (integration === 'github') {
		const result = {
			api: process.env.INTEGRATION_GITHUB_TOKEN || null,
			signature: process.env.INTEGRATION_GITHUB_SIGNATURE_KEY || null
		}

		if (!result.api || !result.signature) {
			return null
		}

		return result
	}

	if (integration === 'front') {
		const result = {
			api: process.env.INTEGRATION_FRONT_TOKEN
		}

		if (!result.api) {
			return null
		}

		return result
	}

	return null
}

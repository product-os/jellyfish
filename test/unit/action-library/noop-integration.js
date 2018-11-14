/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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

module.exports = class NoOpIntegration {
	/**
	 * @summary The NoOp sync integration
	 * @class
	 * @public
	 *
	 * @description
	 * Mainly for testing purposes.
	 *
	 * @example
	 * const integration = new NoOpIntegration()
	 */
	constructor () {
		this.initialized = false
		this.destroyed = false
	}

	/**
   * @summary Initialize the integration
   * @function
   * @public
	 *
   * @example
	 * const integration = new NoOpIntegration()
	 * await integration.initialize()
   */
	async initialize () {
		if (this.initialized) {
			throw new Error('The integration is already initialized')
		}

		this.initialized = true
	}

	/**
   * @summary Destroy the integration
   * @function
   * @public
	 *
   * @example
	 * const integration = new NoOpIntegration()
	 * await integration.initialize()
	 * await integration.destroy()
   */
	async destroy () {
		if (!this.initialized) {
			throw new Error('The integration was not initialized')
		}

		if (this.destroyed) {
			throw new Error('The integration was already destroyed')
		}

		this.destroyed = true
	}

	/**
   * @summary Translate an external event
   * @function
   * @public
	 *
	 * @param {Object} event - external event card
	 * @param {Object} options - options
	 * @param {Object} options.context - execution context
	 * @param {String} options.session - session id
	 * @param {String} options.actor - actor id
	 * @returns {Array} card sequence
   *
   * @example
	 * const integration = new NoOpIntegration()
	 * await integration.initialize()
	 *
	 * const sequence = await integration.translate({ ... }, {
	 *   context: { ... },
	 *   session: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
	 *   actor: 'b76a4589-cac6-4293-b448-0440b5c66498'
	 * })
   */
	// eslint-disable-next-line class-methods-use-this
	async translate (event, options) {
		if (!this.initialized) {
			throw new Error('The integration is not initialized')
		}

		if (this.destroyed) {
			throw new Error('The integration is destroyed')
		}

		return [
			{
				time: new Date(),
				card: {
					type: 'card',
					slug: event.slug,
					version: '1.0.0',
					data: {
						payload: event.data.payload
					}
				}
			}
		]
	}
}

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

const LocalFS = require('./local-fs')
const S3FS = require('./s3-fs')

module.exports = class Storage {
	/**
   * @summary The Jellyfish Kernel
   * @class
   * @public
   *
   * @param {Object} config - Configutation object
	 * @param {String} [config.driver] - Which storage driver to use
   *
   * @example
   * const fileStorage = new Storage({
	 *	driver: 'localFS'
	 * })
   */
	constructor (config = {}) {
		const driver = config.driver || 'localFS'

		if (driver === 'localFS') {
			this.backend = new LocalFS()
		} else if (driver === 's3FS') {
			this.backend = new S3FS()
		} else {
			throw new Error(`Unknown file storage driver: ${driver}`)
		}
	}

	store (scope, name, data) {
		this.backend.store(scope, name, data)
	}

	retrieve (scope, name) {
		return this.backend.retrieve(scope, name)
	}
}

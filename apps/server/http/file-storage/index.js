/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
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
		return this.backend.store(scope, name, data)
	}

	retrieve (scope, name) {
		return this.backend.retrieve(scope, name)
	}
}

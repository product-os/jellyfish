/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const fs = require('fs')
const mkdirp = require('mkdirp-promise')
const path = require('path')

module.exports = class LocalFS {
	constructor () {
		this.numberOfRetries = 1
		this.STORAGE_DIR = 'jellyfish-files'
	}

	store (scope, name, data) {
		return mkdirp(path.join(this.STORAGE_DIR, scope))
			.then(() => {
				return new Bluebird((resolve, reject) => {
					fs.writeFile(path.join(this.STORAGE_DIR, scope, name), data, (err) => {
						if (err) {
							return reject(err)
						}

						return resolve()
					})
				})
			})
	}

	retrieve (scope, name, retries = 0) {
		return new Bluebird((resolve, reject) => {
			fs.readFile(path.join(this.STORAGE_DIR, scope, name), (err, data) => {
				if (err) {
					return reject(err)
				}

				return resolve(data)
			})
		})
			.catch((err) => {
				if (retries < this.numberOfRetries) {
					// Progressively increase the delay the more retries are attempted
					return Bluebird.delay(100 + (100 * retries))
						.then(() => {
							return this.retrieve(scope, name, retries + 1)
						})
				}

				if (err.code === 'ENOENT') {
					return null
				}

				throw err
			})
	}
}

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
			fs.readFile(path.join(this.STORAGE_DIR, scope, name), async (err, data) => {
				if (err) {
					if (retries < this.numberOfRetries) {
						return Bluebird.delay(100)
							.then(() => {
								return this.retrieve(scope, name, retries + 1)
							})
							.then((file) => {
								resolve(file)
							})
					}
					return reject(err)
				}

				return resolve(data)
			})
		})
	}
}

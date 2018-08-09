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

const AWS = require('aws-sdk')
const Bluebird = require('bluebird')

module.exports = class S3FS {
	constructor () {
		const {
			AWS_ACCESS_KEY_ID,
			AWS_SECRET_ACCESS_KEY
		} = process.env

		if (!AWS_ACCESS_KEY_ID) {
			throw new Error('The AWS_ACCESS_KEY_ID environment variable must be provided to use AWS S3 storage')
		}
		if (!AWS_SECRET_ACCESS_KEY) {
			throw new Error('The AWS_SECRET_ACCESS_KEY environment variable must be provided to use AWS S3 storage')
		}

		this.config = {
			accessKeyId: AWS_ACCESS_KEY_ID,
			secretAccessKey: AWS_SECRET_ACCESS_KEY
		}
		this.numberOfRetries = 1
		this.BUCKET_NAME = 'jellyfish-files'
	}

	store (scope, name, data) {
		const s3 = new AWS.S3(this.config)

		return new Bluebird((resolve, reject) => {
			s3.putObject({
				Body: data,
				Key: `${scope}/${name}`,
				Bucket: this.BUCKET_NAME
			},
			(err) => {
				if (err) {
					return reject(err)
				}

				return resolve()
			})
		})
	}

	retrieve (scope, name, retries = 0) {
		const s3 = new AWS.S3(this.config)
		return new Bluebird((resolve, reject) => {
			s3.getObject({
				Key: `${scope}/${name}`,
				Bucket: this.BUCKET_NAME
			},
			(err, data) => {
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

				return resolve(data.Body)
			})
		})
	}
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const AWS = require('aws-sdk')
const Bluebird = require('bluebird')
const environment = require('../../../../lib/environment')

module.exports = class S3FS {
	constructor () {
		if (!environment.aws.accessKeyId) {
			throw new Error(
				'The AWS access key id environment variable must be provided to use AWS S3 storage')
		}
		if (!environment.aws.secretAccessKey) {
			throw new Error(
				'The AWS secret access key environment variable must be provided to use AWS S3 storage')
		}

		this.config = {
			accessKeyId: environment.aws.accessKeyId,
			secretAccessKey: environment.aws.secretAccessKey
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

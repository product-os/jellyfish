/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import AWS from 'aws-sdk';
import _ from 'lodash';
import Bluebird from 'bluebird';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';

const logger = getLogger(__filename);

export class S3FS {
	config;
	numberOfRetries;
	BUCKET_NAME;

	constructor() {
		if (!environment.aws.accessKeyId) {
			throw new Error(
				'The AWS access key id environment variable must be provided to use AWS S3 storage',
			);
		}
		if (!environment.aws.secretAccessKey) {
			throw new Error(
				'The AWS secret access key environment variable must be provided to use AWS S3 storage',
			);
		}

		this.config = {
			accessKeyId: environment.aws.accessKeyId,
			secretAccessKey: environment.aws.secretAccessKey,
		};
		this.numberOfRetries = 1;
		this.BUCKET_NAME = environment.aws.s3BucketName;
	}

	store(context, scope, name, data) {
		const object = {
			Body: data,
			Key: `${scope}/${name}`,
			Bucket: this.BUCKET_NAME,
		};

		logger.info(context, 'Storing S3 object', {
			key: object.Key,
			bucket: object.Bucket,
		});

		const s3 = new AWS.S3(this.config);
		return s3.putObject(object).promise();
	}

	retrieve(context, scope, name, retries = 0) {
		const s3 = new AWS.S3(this.config);

		const object = {
			Key: `${scope}/${name}`,
			Bucket: this.BUCKET_NAME,
		};

		logger.info(context, 'Getting S3 object', {
			key: object.Key,
			bucket: object.Bucket,
		});

		return s3
			.getObject(object)
			.promise()
			.then((data) => {
				logger.info(
					context,
					'S3 object fetch response',
					_.omit(data, ['Body']),
				);
				return data.Body;
			})
			.catch((error) => {
				logger.exception(context, 'S3 error', error);

				if (retries < this.numberOfRetries) {
					return Bluebird.delay(100).then(() => {
						return this.retrieve(context, scope, name, retries + 1);
					});
				}

				throw error;
			});
	}
}

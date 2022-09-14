import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import AWS from 'aws-sdk';
import _ from 'lodash';
import { setTimeout } from 'timers/promises';

const logger = getLogger(__filename);

const RETRIEVE_RETRY_DELAY = 100;

export class Storage {
	private config: AWS.S3.ClientConfiguration;
	private numberOfRetries: number;

	constructor() {
		this.config = {
			accessKeyId: environment.aws.accessKeyId,
			secretAccessKey: environment.aws.secretAccessKey,
		};
		if (environment.aws.s3Endpoint) {
			this.config.endpoint = environment.aws.s3Endpoint;
			this.config.s3ForcePathStyle = true;
			this.config.signatureVersion = 'v4';
		}
		this.numberOfRetries = 1;
	}

	public store(context: LogContext, scope: string, name: string, data) {
		const object = {
			Body: data,
			Key: `${scope}/${name}`,
			Bucket: environment.aws.s3BucketName,
		};

		logger.info(context, 'Storing S3 object', {
			key: object.Key,
			bucket: object.Bucket,
		});

		const s3 = new AWS.S3(this.config);
		return s3.putObject(object).promise();
	}

	public async retrieve(
		context: LogContext,
		scope: string,
		name: string,
		retries = 0,
	) {
		const s3 = new AWS.S3(this.config);

		const object = {
			Key: `${scope}/${name}`,
			Bucket: environment.aws.s3BucketName,
		};

		logger.debug(context, 'Getting S3 object', {
			key: object.Key,
			bucket: object.Bucket,
		});

		try {
			const data = await s3.getObject(object).promise();
			logger.debug(context, 'S3 object fetch response', _.omit(data, ['Body']));
			return data.Body;
		} catch (error: any | AWS.AWSError) {
			const msg = `S3 error when getting object from bucket: ${object.Bucket} key: ${object.Key}`;
			if (
				retries < this.numberOfRetries &&
				(_.isNil(error.retryable) || error.retryable)
			) {
				logger.warn(context, msg + `; retrying ( attempt #${retries})`, error);

				await setTimeout(RETRIEVE_RETRY_DELAY);
				return this.retrieve(context, scope, name, retries + 1);
			}
			logger.exception(context, msg, error);
			throw error;
		}
	}
}

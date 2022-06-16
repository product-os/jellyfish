import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import AWS from 'aws-sdk';
import _ from 'lodash';
import { setTimeout } from 'timers/promises';

const logger = getLogger(__filename);

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

		logger.info(context, 'Getting S3 object', {
			key: object.Key,
			bucket: object.Bucket,
		});

		try {
			const data = await s3.getObject(object).promise();
			logger.info(context, 'S3 object fetch response', _.omit(data, ['Body']));
			return data.Body;
		} catch (error: any) {
			logger.exception(context, 'S3 error', error);

			if (retries < this.numberOfRetries) {
				await setTimeout(100);
				return this.retrieve(context, scope, name, retries + 1);
			}

			throw error;
		}
	}
}

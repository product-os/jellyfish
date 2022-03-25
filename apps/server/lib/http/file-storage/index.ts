import { getLogger } from '@balena/jellyfish-logger';
import { LocalFS } from './local-fs';
import { S3FS } from './s3-fs';

const logger = getLogger(__filename);

export class Storage {
	backend;

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
	 *     driver: 'localFS'
	 * })
	 */
	constructor(config: any = {}) {
		const driver = config.driver || 'localFS';

		if (driver === 'localFS') {
			this.backend = new LocalFS();
		} else if (driver === 's3FS') {
			this.backend = new S3FS();
		} else {
			throw new Error(`Unknown file storage driver: ${driver}`);
		}
	}

	public store(context, scope, name, data) {
		logger.info(context, 'Storing file', {
			scope,
			name,
		});

		return this.backend.store(context, scope, name, data);
	}

	public retrieve(context, scope, name) {
		logger.info(context, 'Retrieving file', {
			scope,
			name,
		});

		return this.backend.retrieve(context, scope, name);
	}
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird';
import fs from 'fs';
import mkdirp from 'mkdirp-promise';
import path from 'path';
const ROOT = path.resolve(__dirname, '../../../..');

export class LocalFS {
	numberOfRetries = 1;
	STORAGE_DIR = path.resolve(ROOT, '.tmp', 'jellyfish-files');

	store(_context, scope, name, data) {
		return mkdirp(path.join(this.STORAGE_DIR, scope)).then(() => {
			return new Bluebird((resolve, reject) => {
				fs.writeFile(path.join(this.STORAGE_DIR, scope, name), data, (err) => {
					if (err) {
						return reject(err);
					}

					return resolve();
				});
			});
		});
	}

	retrieve(_context, scope, name, retries = 0) {
		return new Bluebird((resolve, reject) => {
			fs.readFile(path.join(this.STORAGE_DIR, scope, name), (err, data) => {
				if (err) {
					return reject(err);
				}

				return resolve(data);
			});
		}).catch((err) => {
			if (retries < this.numberOfRetries) {
				// Progressively increase the delay the more retries are attempted
				return Bluebird.delay(100 + 100 * retries).then(() => {
					return this.retrieve(scope, name, retries + 1);
				});
			}

			if (err.code === 'ENOENT') {
				return null;
			}

			throw err;
		});
	}
}

import type { LogContext } from '@balena/jellyfish-logger';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
const ROOT = path.resolve(__dirname, '../../../..');

export class LocalFS {
	private numberOfRetries = 1;
	private STORAGE_DIR = path.resolve(ROOT, '.tmp', 'jellyfish-files');

	public async store(
		_context: LogContext,
		scope: string,
		fileName: string,
		data: string,
	) {
		const dirPath = path.join(this.STORAGE_DIR, scope);
		const filePath = path.join(dirPath, fileName);

		return mkdir(dirPath, { recursive: true }).then(() => {
			return writeFile(filePath, data);
		});
	}

	public async retrieve(
		context: LogContext,
		scope: string,
		name: string,
		retries = 0,
	) {
		const pathFile = path.join(this.STORAGE_DIR, scope, name);

		try {
			return readFile(pathFile);
		} catch (error: any) {
			if (retries < this.numberOfRetries) {
				return new Promise((resolve) => {
					setTimeout(resolve, 100 + 100 * retries);
				}).then(() => {
					return this.retrieve(context, scope, name, retries + 1);
				});
			} else {
				if (error.code === 'ENOENT') {
					return null;
				}

				throw error;
			}
		}
	}
}

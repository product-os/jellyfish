#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const fs = require('fs')
const file = process.argv[2]

if (!file) {
	console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <lock file>`)
	process.exit(1)
}

/*
 * We don't use the same lock module we use in the
 * production code as such module will unconditionally
 * release the lock on exit, while we want the lock
 * to persist after this process is done.
 */

// eslint-disable-next-line no-bitwise
const flags = fs.constants.O_CREAT |
	fs.constants.O_EXCL |
	fs.constants.O_RDWR

const take = (callback) => {
	console.log(`Trying to take lock: ${file}`)
	fs.open(file, flags, (error, fileDescriptor) => {
		if (error) {
			if (error.code === 'EEXIST') {
				console.log('Lock is taken')

				/*
				 * We intend to use this script as a Kubernetes
				 * hook, and Kubernetes can't guarantee that it
				 * won't run this script more than once, therefore
				 * we must make sure that if this script took the
				 * lock, then running the script again succeeds
				 * rather than hang.
				 *
				 * We can do this by making this file store the
				 * filename in the lock file and checking that
				 * if the lock exists.
				 */
				fs.readFile(file, {
					encoding: 'utf8'
				}, (readError, data) => {
					if (readError) {
						callback(readError)
						return
					}

					if (data === __filename) {
						console.log('Lock owner is this script')
						process.exit(0)
					}

					setTimeout(() => {
						take(callback)
					}, 100)
				})

				return
			}

			callback(error)
			return
		}

		fs.write(fileDescriptor, __filename, 0, 'utf8', (writeError) => {
			if (writeError) {
				fs.close(fileDescriptor, (closeError) => {
					if (closeError) {
						callback(closeError)
						return
					}

					callback(writeError)
				})

				return
			}

			fs.close(fileDescriptor, callback)
		})
	})
}

take((error) => {
	if (error) {
		console.error(error)
		process.exit(1)
	}

	console.log(`Lock taken: ${file}`)
})

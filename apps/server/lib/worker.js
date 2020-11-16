/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const uuid = require('@balena/jellyfish-uuid')
const packageJSON = require('../../../package.json')
const bootstrap = require('./bootstrap')

const ERROR_HEADER = 'Worker error'

// Export a function that starts the worker server
module.exports = (onError, options) => {
	const startDate = new Date()

	// Generate random UUID for this instance and start worker server
	uuid.random().then((id) => {
		const context = {
			id: `WORKER-${packageJSON.version}-${id}`
		}

		logger.info(context, 'Starting worker', {
			time: startDate.getTime()
		})

		return bootstrap.worker(context, {
			onError: (serverContext, error) => {
				return onError(serverContext, error)
			},
			jellyfish: options.jellyfish,
			cache: options.cache
		}).then((server) => {
			process.once('SIGINT', async () => {
				await server.stop()
			})
			process.once('SIGTERM', async () => {
				await server.stop()
			})

			const endDate = new Date()
			const timeToStart = endDate.getTime() - startDate.getTime()

			logger.info(context, 'Worker started', {
				time: timeToStart
			})
		}).catch((error) => {
			return onError(error, ERROR_HEADER, context)
		})
	}).catch((error) => {
		return onError(error, ERROR_HEADER)
	})
}

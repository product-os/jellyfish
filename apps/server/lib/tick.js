/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const uuid = require('@balena/jellyfish-uuid')
const packageJSON = require('../../../package.json')
const bootstrap = require('./bootstrap')

const ERROR_HEADER = 'Tick error'

// Export a function that starts the tick server
module.exports = (onError, options) => {
	const startDate = new Date()

	// Generate random UUID for this instance and start tick server
	uuid.random().then((id) => {
		const context = {
			id: `TICK-${packageJSON.version}-${id}`
		}

		logger.info(context, 'Starting tick worker', {
			time: startDate.getTime()
		})

		return bootstrap.tick(context, {
			onError: (serverContext, error) => {
				return onError(error, ERROR_HEADER, serverContext)
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

			logger.info(context, 'Tick worker started', {
				time: timeToStart
			})
		}).catch((error) => {
			return onError(error, ERROR_HEADER, context)
		})
	}).catch((error) => {
		return onError(error, ERROR_HEADER)
	})
}

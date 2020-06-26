/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../../lib/logger').getLogger(__filename)
const uuid = require('@balena/jellyfish-uuid')
const packageJSON = require('../../package.json')
const bootstrap = require('./bootstrap')

const DEFAULT_ERROR_CONTEXT = {
	id: `TICK-ERROR-${packageJSON.version}`
}

const onError = (serverContext, error, message = 'Tick worker error') => {
	logger.exception(serverContext, message, error)
	setTimeout(() => {
		process.exit(1)
	}, 1000)
}

process.on('unhandledRejection', (error) => {
	return onError(DEFAULT_ERROR_CONTEXT, error, 'Unhandled Tick Error')
})

const startDate = new Date()
uuid.random().then((id) => {
	const context = {
		id: `TICK-${packageJSON.version}-${id}`
	}

	logger.info(context, 'Starting tick worker', {
		time: startDate.getTime()
	})

	return bootstrap.tick(context, {
		onError: (serverContext, error) => {
			return onError(serverContext, error)
		}
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
		return onError(context, error)
	})
}).catch((error) => {
	return onError(DEFAULT_ERROR_CONTEXT, error)
})

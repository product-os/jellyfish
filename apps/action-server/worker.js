/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../../lib/logger').getLogger(__filename)
const uuid = require('../../lib/uuid')
const packageJSON = require('../../package.json')
const bootstrap = require('./bootstrap')
require('../../lib/coverage').attach()

const DEFAULT_ERROR_CONTEXT = {
	id: `WORKER-ERROR-${packageJSON.version}`
}

const onError = (serverContext, error, message = 'Worker error') => {
	// eslint-disable-next-line jellyfish/logger-string-expression
	logger.exception(serverContext, message, error)
	setTimeout(() => {
		process.exit(1)
	}, 1000)
}

process.on('unhandledRejection', (error) => {
	return onError(DEFAULT_ERROR_CONTEXT, error, 'Unhandled Worker Error')
})

const startDate = new Date()
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

		logger.info(context, 'Worker started', {
			time: timeToStart
		})
	}).catch((error) => {
		return onError(context, error)
	})
}).catch((error) => {
	return onError(DEFAULT_ERROR_CONTEXT, error)
})

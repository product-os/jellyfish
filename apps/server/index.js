/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../../lib/logger').getLogger(__filename)
const uuid = require('../../lib/uuid')
const packageJSON = require('../../package.json')
const bootstrap = require('./bootstrap')
const environment = require('../../lib/environment')

const DEFAULT_CONTEXT = {
	id: `SERVER-ERROR-${environment.pod.name}-${packageJSON.version}`
}

const onError = (error, message = 'Server error', context = DEFAULT_CONTEXT) => {
	logger.exception(context, message, error)
	setTimeout(() => {
		process.exit(1)
	}, 1000)
}

process.on('unhandledRejection', (error) => {
	return onError(error, 'Unhandled Server Error')
})

uuid.random().then((id) => {
	const context = {
		id: `SERVER-${packageJSON.version}-${environment.pod.name}-${id}`
	}

	const startDate = new Date()
	logger.info(context, 'Starting server', {
		time: startDate.getTime()
	})

	return bootstrap(context).then((server) => {
		const endDate = new Date()
		const timeToStart = endDate.getTime() - startDate.getTime()

		logger.info(context, 'Server started', {
			time: timeToStart,
			port: server.port
		})

		if (timeToStart > 10000) {
			logger.warn(context, 'Slow server startup time', {
				time: timeToStart
			})
		}
	}).catch((error) => {
		logger.exception(context, 'Server error', error)
		process.exit(1)
	})
}).catch((error) => {
	return onError(error)
})

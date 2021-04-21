/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const {
	v4: uuidv4
} = require('uuid')
const packageJSON = require('../../../package.json')
const {
	getPluginManager
} = require('./plugins')
const bootstrap = require('./bootstrap')
const environment = require('@balena/jellyfish-environment').defaultEnvironment

const DEFAULT_CONTEXT = {
	id: `SERVER-ERROR-${environment.pod.name}-${packageJSON.version}`
}

const onError = (error, message = 'Server error', context = DEFAULT_CONTEXT) => {
	logger.exception(context, message, error)
	console.error({
		context,
		message,
		error
	})
	console.error('Process exiting')
	setTimeout(() => {
		process.exit(1)
	}, 1000)
}

process.on('unhandledRejection', (error) => {
	return onError(error, 'Unhandled Server Error')
})

const id = uuidv4()
const context = {
	id: `SERVER-${packageJSON.version}-${environment.pod.name}-${id}`
}

const startDate = new Date()
logger.info(context, 'Starting server', {
	time: startDate.getTime()
})

try {
	const options = {
		pluginManager: getPluginManager(context)
	}

	bootstrap(context, options).then((server) => {
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
} catch (error) {
	onError(error)
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const uuid = require('@balena/jellyfish-uuid')
const packageJSON = require('../../../package.json')
const bootstrap = require('./bootstrap')
const environment = require('@balena/jellyfish-environment')

const ERROR_HEADER = 'Server error'

// Export a function that starts the API server
module.exports = (onError, options) => {
	const startDate = new Date()

	// Generate random UUID for this instance and start API server
	uuid.random().then((id) => {
		const context = {
			id: `SERVER-${packageJSON.version}-${environment.pod.name}-${id}`
		}

		logger.info(context, 'Starting server', {
			time: startDate.getTime()
		})

		return bootstrap.api(context, options).then((server) => {
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
			logger.exception(error, ERROR_HEADER, context)
			process.exit(1)
		})
	}).catch((error) => {
		return onError(error, ERROR_HEADER)
	})
}

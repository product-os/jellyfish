/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../../lib/logger').getLogger(__filename)
const uuid = require('../../lib/uuid')
const packageJSON = require('../../package.json')
const bootstrap = require('./bootstrap')

uuid().then((id) => {
	const context = {
		id: `SERVER-${packageJSON.version}-${id}`
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
		setTimeout(() => {
			process.exit(1)
		}, 5000)
	})
}).catch((error) => {
	logger.exception({
		id: `SERVER-ERROR-${packageJSON.version}`
	}, 'Server error', error)
	setTimeout(() => {
		process.exit(1)
	}, 5000)
})

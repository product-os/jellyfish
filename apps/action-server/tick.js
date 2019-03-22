/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const logger = require('../../lib/logger').getLogger(__filename)
const bootstrap = require('./bootstrap')

const context = {
	id: `TICK-${uuid()}`
}

const startDate = new Date()
logger.info(context, 'Starting tick worker', {
	time: startDate.getTime()
})

const onError = (serverContext, error) => {
	logger.exception(serverContext, 'Tick worker error', error)
	setTimeout(() => {
		process.exit(1)
	}, 5000)
}

bootstrap.tick(context, {
	onError: (serverContext, error) => {
		return onError(serverContext, error)
	}
}).then((server) => {
	const endDate = new Date()
	const timeToStart = endDate.getTime() - startDate.getTime()

	logger.info(context, 'Tick worker started', {
		time: timeToStart
	})
}).catch((error) => {
	return onError(context, error)
})

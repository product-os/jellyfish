/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const randomstring = require('randomstring')
const logger = require('../../lib/logger').getLogger(__filename)
const bootstrap = require('./bootstrap')

const context = {
	id: `WORKER-${randomstring.generate(20)}`
}

const startDate = new Date()
logger.info(context, 'Starting worker', {
	time: startDate.getTime()
})

const onError = (serverContext, error) => {
	logger.exception(serverContext, 'Worker error', error)
	setTimeout(() => {
		process.exit(1)
	}, 5000)
}

bootstrap.worker(context, {
	onError: (serverContext, error) => {
		return onError(serverContext, error)
	}
}).then((server) => {
	const endDate = new Date()
	const timeToStart = endDate.getTime() - startDate.getTime()

	logger.info(context, 'Worker started', {
		time: timeToStart
	})
}).catch((error) => {
	return onError(context, error)
})

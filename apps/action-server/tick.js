/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../../lib/logger').getLogger(__filename)
const uuid = require('../../lib/uuid')
const packageJSON = require('../../package.json')
const bootstrap = require('./bootstrap')

const onError = (serverContext, error) => {
	logger.exception(serverContext, 'Tick worker error', error)
	setTimeout(() => {
		process.exit(1)
	}, 5000)
}

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
		const endDate = new Date()
		const timeToStart = endDate.getTime() - startDate.getTime()

		logger.info(context, 'Tick worker started', {
			time: timeToStart
		})
	}).catch((error) => {
		return onError(context, error)
	})
}).catch((error) => {
	return onError({
		id: `TICK-ERROR-${packageJSON.version}`
	}, error)
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const environment = require('@balena/jellyfish-environment')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const metrics = require('@balena/jellyfish-metrics')

const packageJSON = require('../../../package.json')
const services = {
	api: require('./api'),
	worker: require('./worker'),
	tick: require('./tick')
}
const utils = require('./utils')

const DEFAULT_CONTEXT = {
	id: `SERVER-${environment.pod.name}-${packageJSON.version}`
}

/**
 * @summary Handle server errors
 * @function
 *
 * @param {Object} error - error that occurred
 * @param {String} message - error message header
 * @param {Object} context - execution context
 */
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

/**
 * @summary Start backend services
 * @function
 */
const start = async () => {
	// Error out immediately if required backend services environment variable is not set
	if (_.isEmpty(environment.backend.services)) {
		throw new Error('Must set backend service(s)')
	}

	// Set up backend here so we can share with multiple services
	const cache = await utils.setupCache(DEFAULT_CONTEXT)
	const jellyfish = await utils.setupCore(DEFAULT_CONTEXT, cache)

	// Start services specified in BACKEND_SERVICES comma-delimited string
	const backendServices = _.uniq(environment.backend.services.split(','))
	_.forEach(backendServices, (service) => {
		services[service](onError, {
			cache,
			jellyfish
		})
	})

	// Start metrics server if api or worker instances were started
	if (backendServices.includes('api') || backendServices.includes('worker')) {
		metrics.startServer(DEFAULT_CONTEXT, environment.metrics.ports.app)
	}
}

start()

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')

const environment = require('../../lib/environment')
const Cache = require('../../lib/core/cache')
const errors = require('../../lib/core/errors')
const Backend = require('../../lib/core/backend')
const Worker = require('../../lib/worker')
const actionLibrary = require('../../lib/action-library')

const sdkHelpers = require('./sdk')
const queueHelpers = require('./queue')
const kernelHelpers = require('./kernel')

const generateRandomSlug = (options) => {
	const suffix = uuid()
	if (options.prefix) {
		return `${options.prefix}-${suffix}`
	}
	return suffix
}

const createWorker = async ({
	context,
	kernel,
	session,
	queue
}) => {
	const library = Object.assign({
		// For testing purposes
		'action-test-originator': {
			card: Object.assign({}, actionLibrary['action-create-card'].card, {
				slug: 'action-test-originator'
			}),
			handler: async (lsession, lcontext, card, request) => {
				request.arguments.properties.data = request.arguments.properties.data || {}
				request.arguments.properties.data.originator = request.originator
				return actionLibrary['action-create-card']
					.handler(lsession, lcontext, card, request)
			}
		}
	}, actionLibrary)

	const worker = new Worker(
		kernel,
		session,
		library,
		queue.consumer,
		queue.producer
	)
	await worker.initialize(context)
	return worker
}

const createCache = ({
	dbName,
	context = {}
}) => {
	const cache = new Cache(
		Object.assign({}, environment.redis, {
			namespace: dbName
		}))
	cache.connect(context)
	return cache
}

const createBackend = async ({
	cache,
	dbName,
	context,
	options = {}
}) => {
	const backend = new Backend(
		cache,
		errors,
		Object.assign({}, environment.database.options, {
			database: dbName
		}))
	if (options.skipConnect) {
		return backend
	}
	await backend.connect(context)
	return backend
}

module.exports = {
	generateRandomSlug,
	createWorker,
	createCache,
	createBackend,
	...sdkHelpers,
	...queueHelpers,
	...kernelHelpers
}

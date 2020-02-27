const randomWords = require('random-words')
const uuid = require('uuid/v4')
const Bluebird = require('bluebird')

const environment = require('../../lib/environment')
const Cache = require('../../lib/core/cache')
const errors = require('../../lib/core/errors')
const Backend = require('../../lib/core/backend')
const Kernel = require('../../lib/core/kernel')
const Worker = require('../../lib/worker')
const Queue = require('../../lib/queue')
const actionLibrary = require('../../lib/action-library')

const sdkHelpers = require('./sdk')

const generateRandomWords = (numberOfWords) => {
	return randomWords(numberOfWords).join(' ')
}

const generateRandomSlug = ({ prefix }) => {
	const suffix = uuid()
	if (prefix){
		return `${prefix}-${suffix}`
	}
	return suffix
}

const createWorker = async ({ kernel, session, queue }) => {
	const library = Object.assign({
		// For testing purposes
		'action-test-originator': {
			card: Object.assign({}, actionLibrary['action-create-card'].card, {
				slug: 'action-test-originator'
			}),
			handler: async (session, context, card, request) => {
				request.arguments.properties.data = request.arguments.properties.data || {}
				request.arguments.properties.data.originator = request.originator
				return actionLibrary['action-create-card']
					.handler(session, context, card, request)
			}
		}
	}, actionLibrary)

	const worker = new Worker(
		kernel,
		session,
		library,
		queue)
	return worker
}

const createCache = ({ dbName, context = {}}) => {
	const cache = new Cache(
		Object.assign({}, environment.redis, {
			namespace: dbName
		}))

	cache.connect(context)
	return cache
}

const createBackend = async ({ cache, dbName, context, options = {} }) => {
	const backend = new Backend(
		cache,
		errors,
		Object.assign({}, environment.database.options, {
			database: dbName
		}))
	if (options.skipConnect){
		return backend
	}
	await backend.connect(context)
	return backend
}

const createKernel = async (backend, context) => {
	const kernel = new Kernel(backend)
	await kernel.initialize(context)
	return kernel
}

const createQueue = async ({ context, kernel, session, options = {} }) => {
	const queue = new Queue(
		context,
		kernel,
		session,
		options
	)
	queue.once('error', (error) => {
		throw error
	})

	queue.initialize(context)
	return queue
}

const dequeue = async ({ queue, context, actor, queueActor, times = 50 }) => {
	const request = await queue.dequeue(context, queueActor)
	console.log(request)
	if (!request) {
		if (times <= 0) {
			return null
		}

		await Bluebird.delay(1)
		return dequeue({ queue, context, actor, times: times- 1 })
	}

	return request
}

module.exports = {
	generateRandomWords,
	generateRandomSlug,
	createWorker,
	createCache,
	createBackend,
	createKernel,
	createQueue,
	dequeue,
	...sdkHelpers
}

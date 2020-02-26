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

const createWorker = ({ kernel, session, queue }) => {
	return new Worker(
		kernel,
		session,
		Object.assign({
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
		}),
		queue)
}

const createCache = ({ dbName, context }) => {
	const cache = new Cache(
		Object.assign({}, environment.redis, {
			namespace: dbName
		}))

	cache.connect(context)
	return cache
}

const createBackend = async ({ options, cache, dbName, context }) => {
	const backend = new Backend(
		cache,
		errors,
		Object.assign({}, environment.database.options, {
			database: dbName
		}))
		if (options.skipConnect){
			return
		}
		await backend.connect(context)
}

const createKernel = async (backend, testId) => {
	const kernel = new Kernel(backend)
	await kernel.initialise({ id: testId })
	return kernel
}

const createQueue = async ({ context, kernel, session, options }) => {
	const queue = new Queue({
		context,
		kernel,
		session,
		options
	})
	queue.once('error', (error) => {
		throw error
	})

	queue.initialize({ id: testId })
	return queue
}

const dequeue = async ({ queue, context, actor, queueActor, times = 50 }) => {
	const request = await queue.dequeue(context, queueActor)
	if (!request) {
		if (times <= 0) {
			return null
		}

		await Bluebird.delay(1)
		return dequeue(context, actor, times - 1)
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

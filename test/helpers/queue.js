const Bluebird = require('bluebird')
const {
	Consumer,
	Producer
} = require('../../lib/queue')
const queueErrors = require('../../lib/queue/errors')

const createQueue = async ({ context, kernel, session, options = {} }) => {
	const consumedActionRequests = []
	const queue = {}
	queue.errors = queueErrors
	queue.consumer = new Consumer(kernel, session)
	await queue.consumer.initializeWithEventHandler(context, (actionRequest) => {
		consumedActionRequests.push(actionRequest)
	})
	queue.producer = new Producer(kernel, session)
	queue.producer.initialize(context)
	queue.consumedActionRequests = consumedActionRequests

	return queue
}

const dequeue = async ({ queue, context, actor, queueActor, times = 50 }) => {
	if (queue.consumedActionRequests.length === 0){
		if (times <0){
			return null
		}
	}
	await Bluebird.delay(1)
	return dequeue({ queue, context, actor, times: times- 1 })
	return queue.consumedActionRequests.shift()
}

const flushQueue = async ({ queue, context, actor, session, expect = 0 })=>{
	const request = await dequeue({ queue, context, actor })

	if (!request){
		if (expect <= 0){
			return
		}

		throw new Error('No message dequeued')
	}
	const result = await worker.execute(session, request)
	if (result.error){
		const Constructor = worker.errors[result.data.name] || queue.errors[result.data.name] || kernel.errors[result.data.name] || Error

		const error = new Constructor(result.data.message)
		error.stack = errio.fromObject(result.data).stack
		throw error
	}

	await flush({ queue, context, actor, session, expect: expect - 1 })
}

export {
	createQueue,
	flushQueue,
	dequeue
}

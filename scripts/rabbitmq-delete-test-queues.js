#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const environment = require('../lib/environment')
const amqplib = require('amqplib')
const request = require('request-promise')
const Spinner = require('cli-spinner').Spinner
const Bluebird = require('bluebird')

const scrub = async () => {
	const spinner = new Spinner('%s Connecting to rabbitmq')

	let rabbit = null
	try {
		rabbit = await amqplib.connect(`amqp://${environment.rabbitmq.hostname}:${environment.rabbitmq.port}`)
	} catch (error) {
		if (error.code === 'ECONNREFUSED' && error.syscall === 'connect') {
			console.log('Couldn\'t connect to Rabbitmq')
			return
		}

		throw error
	}

	spinner.start()

	const channel = await rabbit.createConfirmChannel()

	const queues = await request(`http://${environment.rabbitmq.username}:${environment.rabbitmq.password}@${environment.rabbitmq.hostname}:${environment.rabbitmq.managementPort}/api/queues/`)
		.then((body) => {
			return JSON.parse(body)
		})

	const testQueues = queues
		.map((queue) => {
			return queue.name
		})
		.filter((queue) => {
			return queue.startsWith('test_')
		})

	spinner.setSpinnerTitle(`%s Preparing to delete ${testQueues.length} test queues`)

	let deletedQueues = 0

	await Bluebird.map(testQueues, async (testQueue) => {
		await channel.deleteQueue(testQueue)
		spinner.setSpinnerTitle(`%s Deleted queue ${testQueue} (${++deletedQueues}/${testQueues.length})`)
	})

	spinner.stop(true)
	console.log(`Deleted ${testQueues.length} test queues`)

	await rabbit.close()
}

scrub().catch((error) => {
	console.error(error)
	process.exit(1)
})

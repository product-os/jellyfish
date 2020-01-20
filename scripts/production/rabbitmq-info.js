#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const environment = require('../../lib/environment')
const request = require('request-promise')

const run = async () => {
	const queues = await request(`http://${environment.rabbitmq.username}:${environment.rabbitmq.password}@${environment.rabbitmq.host}:${environment.rabbitmq.managementPort}/api/queues/`)
		.then((body) => {
			return JSON.parse(body)
		})

	console.log('Queues')
	queues.forEach((queue) => {
		console.log(queue.name)
	})
	console.log()

	const consumers = await request(`http://${environment.rabbitmq.username}:${environment.rabbitmq.password}@${environment.rabbitmq.host}:${environment.rabbitmq.managementPort}/api/consumers/`)
		.then((body) => {
			return JSON.parse(body)
		})

	console.log('Consumers')
	consumers.forEach((consumer) => {
		console.log(`Queue: ${consumer.queue.name}, prefetch count: ${consumer.prefetch_count}`)
	})
}

run().catch(console.error)

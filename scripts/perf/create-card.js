/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const request = require('request')
const uuid = require('../../lib/uuid')
const TOKEN = process.argv[2]

if (!TOKEN) {
	console.error(`Usage: $${process.argv[0]} ${process.argv[1]} <token>`)
	process.exit(1)
}

const action = (slug) => {
	console.log(`> Creating ${slug}`)
	return new Promise((resolve, reject) => {
		console.time(slug)
		request({
			baseUrl: 'http://localhost:8000',
			method: 'POST',
			uri: '/api/v2/action',
			json: true,
			headers: {
				Authorization: `Bearer ${TOKEN}`
			},
			body: {
				card: 'card',
				type: 'type',
				action: 'action-create-card',
				arguments: {
					reason: null,
					properties: {
						slug,
						data: {
							test: true
						}
					}
				}
			}
		}, (error, response, body) => {
			console.timeEnd(slug)
			if (error) {
				return reject(error)
			}

			if (response.statusCode !== 200) {
				const summary = JSON.stringify(body, null, 2)
				return reject(new Error(
					`Got code ${response.statusCode}: ${summary}`))
			}

			return resolve(body)
		})
	})
}

const run = async () => {
	while (true) {
		await action(`card-test-${await uuid.random()}`)
	}
}

run().catch((error) => {
	console.error(error)
	process.exit(1)
})

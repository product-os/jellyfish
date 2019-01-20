require('ts-node').register()

const Bluebird = require('bluebird')
const marky = require('marky')
const randomstring = require('randomstring')
const uuid = require('uuid/v4')
const {
	jellyfishSdk
} = require('../lib/sdk')
const bootstrap = require('../lib/bootstrap')
const utils = require('./utils')

const ITERATIONS = 10

// Measures the time it takes between creating a message that mentions a user,
// and the target thread being updated
const run = async () => {
	// Set this env var so that the server uses a random database
	process.env.SERVER_DATABASE = `test_${randomstring.generate()}`

	console.log('Starting server')

	const {
		port
	} =	await bootstrap({
		id: 'SERVER'
	})

	// Since AVA tests are running concurrently, set up an SDK instance that will
	// communicate with whichever port this server instance bound to
	const sdk = jellyfishSdk({
		apiPrefix: process.env.API_PREFIX || 'api/v1',
		apiUrl: `http://localhost:${port}`
	})

	const user = {
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'foobarbaz'
	}

	const userId = await sdk.auth.signup(user)

	await sdk.auth.login(user)

	console.log(`Logged in as ${user.username} (${userId})`)

	const threadId = await sdk.card.create({
		type: 'thread',
		data: {}
	})

	console.log(`Created thread ${threadId}`)

	const timeAggregate = (index) => {
		const name = `Message ${index}`

		return new Promise((resolve, reject) => {
			const mentionsId = uuid()

			const stream = sdk.stream({
				type: 'object',
				properties: {
					type: {
						const: 'thread'
					},
					data: {
						type: 'object',
						properties: {
							mentionsUser: {
								contains: {
									const: mentionsId
								}
							}
						},

						required: [ 'mentionsUser' ],
						additionalProperties: true
					}
				},
				required: [ 'type', 'data' ],
				additionalProperties: true
			})

			stream.on('data', () => {
				marky.mark(name)
				sdk.card.create({
					data: {
						actor: userId,
						payload: {
							mentionsUser: [ mentionsId ],
							message: 'test'
						},
						target: threadId,
						timestamp: '2018-05-31T13:45:48.756Z'
					},
					type: 'message'
				})

				stream.on('update', (data) => {
					stream.destroy()
					marky.stop(name)
					resolve()
				})
			})

			stream.on('streamError', (error) => {
				console.log('Error', error)
			})
		})
	}

	const runSerial = () => {
		marky.clear()
		console.log('\n==== Running tests in serial\n')
		return Bluebird.each(new Array(ITERATIONS), (_item, index) => {
			return timeAggregate(index)
		})
			.then(() => {
				const entries = marky.getEntries()

				utils.logSummary(entries)
			})
	}

	const runParallel = () => {
		marky.clear()
		console.log('\n==== Running tests in parallel\n')
		return Bluebird.map(new Array(ITERATIONS), (_item, index) => {
			return timeAggregate(index)
		})
			.then(() => {
				const entries = marky.getEntries()

				utils.logSummary(entries)
			})
	}

	return runParallel()
		.then(() => {
			console.log('\n----\n')
		})
		.then(runSerial)
		.then(() => {
			process.exit()
		})
}

run()

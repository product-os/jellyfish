/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const randomstring = require('randomstring')
const core = require('../../lib/core')
const nock = require('nock')
const Worker = require('../../lib/worker/index')
const actionLibrary = require('../../lib/action-library')

exports.domains = {
	api: {
		domain: 'https://jsonplaceholder.typicode.com',
		path: '/todos/1',
		status: 200,
		body: {
			userId: 1,
			id: 1,
			title: 'delectus aut autem',
			completed: false
		}
	},
	duff: {
		domain: 'duff'
	},
	err: {
		domain: 'https://www.example.com',
		path: '/duff.html',
		status: 404
	}
}

exports.beforeEach = async (test) => {
	test.context.jellyfish = await core.create({
		backend: {
			host: process.env.TEST_DB_HOST,
			port: process.env.TEST_DB_PORT,
			database: `test_${randomstring.generate()}`
		}
	})

	await test.context.jellyfish.initialize()
	test.context.session = test.context.jellyfish.sessions.admin

	const adminSession = await test.context.jellyfish.getCardById(
		test.context.session,
		test.context.session
	)
	test.context.actor = await test.context.jellyfish.getCardById(
		test.context.session,
		adminSession.data.actor
	)

	await test.context.jellyfish.insertCard(
		test.context.session,
		require('../../default-cards/contrib/execute.json')
	)
	await test.context.jellyfish.insertCard(
		test.context.session,
		require('../../default-cards/contrib/action-http-request.json')
	)

	test.context.worker = new Worker(
		test.context.jellyfish,
		test.context.session,
		actionLibrary
	)
	const worker = test.context.worker

	test.context.flush = async (sessionToFlush) => {
		if (await worker.length() === 0) {
			return
		}

		const request = await worker.dequeue()
		const result = await worker.execute(
			sessionToFlush,
			request
		)

		if (result.error) {
			const Constructor = worker.errors[result.data.type] ||
				test.context.jellyfish.errors[result.data.type] ||
				Error

			throw new Constructor(result.data.message)
		}

		await test.context.flush(sessionToFlush)
	}

	nock(exports.domains.api.domain)
		.get(exports.domains.api.path)
		.reply(exports.domains.api.status, exports.domains.api.body)

	nock(exports.domains.err.domain)
		.get(exports.domains.err.path)
		.reply(exports.domains.err.status)
}

exports.afterEach = async (test) => {
	await test.context.jellyfish.disconnect()
}

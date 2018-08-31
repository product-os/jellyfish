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

const ava = require('ava')
const Bluebird = require('bluebird')
const helpers = require('./helpers')
const events = require('../../../lib/worker/events')

ava.test.beforeEach(helpers.beforeEach)
ava.test.afterEach(helpers.afterEach)

ava.test('.post() should insert an active execute card', async (test) => {
	await events.post(test.context.jellyfish, test.context.session, {
		id: '8fd7be57-4f68-4faf-bbc6-200a7c62c41a',
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	const card = await test.context.jellyfish.getCardById(test.context.session, '8fd7be57-4f68-4faf-bbc6-200a7c62c41a')
	test.true(card.active)
	test.is(card.type, 'execute')
})

ava.test('.post() should set a present timestamp', async (test) => {
	const currentDate = new Date()

	const card = await events.post(test.context.jellyfish, test.context.session, {
		id: '8fd7be57-4f68-4faf-bbc6-200a7c62c41a',
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	test.true(new Date(card.data.timestamp) >= currentDate)
})

ava.test('.post() should use the passed id', async (test) => {
	const card = await events.post(test.context.jellyfish, test.context.session, {
		id: '8fd7be57-4f68-4faf-bbc6-200a7c62c41a',
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	test.is(card.id, '8fd7be57-4f68-4faf-bbc6-200a7c62c41a')
})

ava.test('.post() should fail if the action is a slug', async (test) => {
	await test.throws(events.post(test.context.jellyfish, test.context.session, {
		id: '8fd7be57-4f68-4faf-bbc6-200a7c62c41a',
		action: 'action-create-card',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava.test('.post() should fail if no result error', async (test) => {
	await test.throws(events.post(test.context.jellyfish, test.context.session, {
		id: '8fd7be57-4f68-4faf-bbc6-200a7c62c41a',
		action: 'action-create-card',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava.test('.post() should use the passed timestamp in the payload', async (test) => {
	const card = await events.post(test.context.jellyfish, test.context.session, {
		id: '8fd7be57-4f68-4faf-bbc6-200a7c62c41a',
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	test.is(card.data.payload.timestamp, '2018-06-30T19:34:42.829Z')
	test.not(card.data.payload.timestamp, card.data.timestamp)
})

ava.test('.post() should allow an object result', async (test) => {
	const card = await events.post(test.context.jellyfish, test.context.session, {
		id: '8fd7be57-4f68-4faf-bbc6-200a7c62c41a',
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: {
			value: 5
		}
	})

	test.deepEqual(card.data.payload.data, {
		value: 5
	})
})

ava.test.cb('.wait() should return when a certain execute event is inserted', (test) => {
	const id = '8fd7be57-4f68-4faf-bbc6-200a7c62c41a'
	events.wait(test.context.jellyfish, test.context.session, id).then((request) => {
		test.is(request.id, id)
		test.end()
	}).catch(test.end)

	Bluebird.delay(500).then(() => {
		return events.post(test.context.jellyfish, test.context.session, {
			id,
			action: '57692206-8da2-46e1-91c9-159b2c6928ef',
			card: '033d9184-70b2-4ec9-bc39-9a249b186422',
			actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
			timestamp: '2018-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: '414f2345-4f5e-4571-820f-28a49731733d'
		})
	}).catch(test.end)
})

ava.test('.wait() should return if the card already exists', async (test) => {
	const id = '8fd7be57-4f68-4faf-bbc6-200a7c62c41a'
	await events.post(test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	const card = await events.wait(test.context.jellyfish, test.context.session, id)
	test.is(card.id, id)
})

ava.test('.wait() should be able to access the event payload', async (test) => {
	const id = '8fd7be57-4f68-4faf-bbc6-200a7c62c41a'
	await events.post(test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	const card = await events.wait(test.context.jellyfish, test.context.session, id)
	test.deepEqual(card.data.payload, {
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		timestamp: '2018-06-30T19:34:42.829Z',
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})
})

ava.test.cb('.wait() should ignore cards that do not match the id', (test) => {
	const id = '8fd7be57-4f68-4faf-bbc6-200a7c62c41a'
	events.wait(test.context.jellyfish, test.context.session, id).then((request) => {
		test.is(request.data.payload.timestamp, '2020-06-30T19:34:42.829Z')
		test.end()
	}).catch(test.end)

	Bluebird.delay(500).then(async () => {
		await events.post(test.context.jellyfish, test.context.session, {
			id: '57692206-8da2-46e1-91c9-159b2c6928ef',
			action: '57692206-8da2-46e1-91c9-159b2c6928ef',
			card: '033d9184-70b2-4ec9-bc39-9a249b186422',
			actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
			timestamp: '2018-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: '414f2345-4f5e-4571-820f-28a49731733d'
		})

		await events.post(test.context.jellyfish, test.context.session, {
			id: '033d9184-70b2-4ec9-bc39-9a249b186422',
			action: '57692206-8da2-46e1-91c9-159b2c6928ef',
			card: '033d9184-70b2-4ec9-bc39-9a249b186422',
			actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
			timestamp: '2019-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: '414f2345-4f5e-4571-820f-28a49731733d'
		})

		await events.post(test.context.jellyfish, test.context.session, {
			id,
			action: '57692206-8da2-46e1-91c9-159b2c6928ef',
			card: '033d9184-70b2-4ec9-bc39-9a249b186422',
			actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
			timestamp: '2020-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: '414f2345-4f5e-4571-820f-28a49731733d'
		})
	}).catch(test.end)
})

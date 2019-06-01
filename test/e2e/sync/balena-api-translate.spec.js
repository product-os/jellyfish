/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const querystring = require('querystring')
const randomstring = require('randomstring')
const url = require('url')
const jose = require('node-jose')
const jws = require('jsonwebtoken')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.getIntegrationToken('balena-api')

ava.beforeEach(helpers.translate.beforeEach)
ava.afterEach(helpers.translate.afterEach)

const avaTest = TOKEN ? ava.serial : ava.skip

const prepareEvent = async (event) => {
	const signedToken = jws.sign({
		data: event.payload
	}, Buffer.from(TOKEN.privateKey, 'base64'), {
		algorithm: 'ES256',
		expiresIn: 10 * 60 * 1000,
		audience: 'jellyfish',
		issuer: 'api.balena-cloud.com',
		jwtid: randomstring.generate(20),
		subject: `${event.payload.id}`
	})

	const keyValue = Buffer.from(TOKEN.publicKey, 'base64')
	const encryptionKey = await jose.JWK.asKey(keyValue, 'pem')

	const cipher = jose.JWE.createEncrypt({
		format: 'compact'
	}, encryptionKey)
	cipher.update(signedToken)

	const result = await cipher.final()
	event.source = 'balena-api'
	event.payload = result
	event.headers['content-type'] = 'application/jose'
	return event
}

avaTest('should change the remote username to an existing unsynced user', async (test) => {
	await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'user-johndoe',
			type: 'user',
			version: '1.0.0',
			data: {
				email: 'foo@bar.com',
				roles: []
			}
		})

	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:46.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 124,
					username: 'janedoe',
					email: 'jane@balena.io',
					company: 'Balena.io'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 124,
					username: 'johndoe',
					email: 'jane@balena.io',
					company: 'Balena.io'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const johnDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const janeDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-janedoe')

	test.true(johnDoe.active)
	test.deepEqual(johnDoe.data, {
		email: 'jane@balena.io',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [],
		origin: johnDoe.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(124)' ],
		profile: {
			company: 'Balena.io'
		}
	})

	test.false(janeDoe.active)
	test.deepEqual(janeDoe.data, {
		email: 'jane@balena.io',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [],
		profile: {
			company: 'Balena.io'
		}
	})
})

avaTest('should change the remote username to an existing user', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe',
					email: 'john@souvlakitek.com',
					company: 'Souvlaki Tek'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:46.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 124,
					username: 'janedoe',
					email: 'jane@balena.io',
					company: 'Balena.io'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 124,
					username: 'johndoe',
					email: 'jane@balena.io',
					company: 'Balena.io'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const johnDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const janeDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-janedoe')

	test.true(johnDoe.active)
	test.deepEqual(johnDoe.data, {
		translateDate: '2019-04-17T15:26:45.231Z',
		email: 'jane@balena.io',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(124)' ],
		profile: {
			company: 'Balena.io'
		}
	})

	test.false(janeDoe.active)
	test.deepEqual(janeDoe.data, {
		translateDate: '2019-04-17T15:26:45.231Z',
		email: 'jane@balena.io',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [],
		profile: {
			company: 'Balena.io'
		}
	})
})

avaTest('should change the remote username to an existing user while removing existing username', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe',
					email: 'john@souvlakitek.com',
					company: 'Souvlaki Tek'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:46.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 124,
					username: 'janedoe',
					first_name: 'Jane',
					last_name: 'Doe'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:49.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 124,
					username: 'johndoe'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const johnDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const janeDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-janedoe')

	test.true(johnDoe.active)
	test.deepEqual(johnDoe.data, {
		translateDate: '2019-04-17T15:26:49.231Z',
		email: 'john@souvlakitek.com',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(124)' ],
		profile: {
			company: 'Souvlaki Tek',
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})

	test.false(janeDoe.active)
	test.deepEqual(janeDoe.data, {
		translateDate: '2019-04-17T15:26:49.231Z',
		email: 'new@change.me',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [],
		profile: {
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})
})

avaTest('should change the remote username to an existing user and add a name', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe',
					email: 'john@souvlakitek.com',
					company: 'Souvlaki Tek'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:46.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 124,
					username: 'janedoe',
					first_name: 'Jane',
					last_name: 'Doe'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:49.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 124,
					username: 'johndoe',
					first_name: 'Jane',
					last_name: 'Doe'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const johnDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const janeDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-janedoe')

	test.true(johnDoe.active)
	test.deepEqual(johnDoe.data, {
		email: 'john@souvlakitek.com',
		translateDate: '2019-04-17T15:26:49.231Z',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(124)' ],
		profile: {
			company: 'Souvlaki Tek',
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})

	test.false(janeDoe.active)
	test.deepEqual(janeDoe.data, {
		email: 'new@change.me',
		translateDate: '2019-04-17T15:26:49.231Z',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [],
		profile: {
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})
})

avaTest('should change the remote username to an existing user while removing the name', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe',
					email: 'john@souvlakitek.com',
					first_name: 'John',
					last_name: 'Doe',
					company: 'Souvlaki Tek'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:46.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 124,
					username: 'janedoe'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:49.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 124,
					username: 'johndoe'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const johnDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const janeDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-janedoe')

	test.true(johnDoe.active)
	test.deepEqual(johnDoe.data, {
		translateDate: '2019-04-17T15:26:49.231Z',
		email: 'john@souvlakitek.com',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(124)' ],
		profile: {
			company: 'Souvlaki Tek',
			name: {
				first: 'John',
				last: 'Doe'
			}
		}
	})

	test.false(janeDoe.active)
	test.deepEqual(janeDoe.data, {
		translateDate: '2019-04-17T15:26:49.231Z',
		email: 'new@change.me',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: []
	})
})

avaTest('should change the remote username to an existing user while removing the email', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe',
					email: 'john@souvlakitek.com',
					first_name: 'John',
					last_name: 'Doe',
					company: 'Souvlaki Tek'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:46.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 124,
					username: 'janedoe',
					email: 'jane@balena.io',
					first_name: 'Jane',
					last_name: 'Doe',
					company: 'Balena.io'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 124,
					username: 'johndoe',
					first_name: 'Jane',
					last_name: 'Doe',
					company: 'Balena.io'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const johnDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const janeDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-janedoe')

	test.true(johnDoe.active)
	test.deepEqual(johnDoe.data, {
		translateDate: '2019-04-17T15:26:45.231Z',
		email: 'john@souvlakitek.com',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(124)' ],
		profile: {
			company: 'Balena.io',
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})

	test.false(janeDoe.active)
	test.deepEqual(janeDoe.data, {
		email: 'jane@balena.io',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [],
		profile: {
			company: 'Balena.io',
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})
})

avaTest('should change the remote username to an existing user with a name', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe',
					email: 'john@souvlakitek.com',
					first_name: 'John',
					last_name: 'Doe',
					company: 'Souvlaki Tek'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:46.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 124,
					username: 'janedoe',
					email: 'jane@balena.io',
					first_name: 'Jane',
					last_name: 'Doe',
					company: 'Balena.io'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 124,
					username: 'johndoe',
					email: 'jane@balena.io',
					first_name: 'Jane',
					last_name: 'Doe',
					company: 'Balena.io'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const johnDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const janeDoe = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-janedoe')

	test.true(johnDoe.active)
	test.deepEqual(johnDoe.data, {
		email: 'jane@balena.io',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(124)' ],
		profile: {
			company: 'Balena.io',
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})

	test.false(janeDoe.active)
	test.deepEqual(janeDoe.data, {
		email: 'jane@balena.io',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: johnDoe.data.origin,
		mirrors: [],
		profile: {
			company: 'Balena.io',
			name: {
				first: 'Jane',
				last: 'Doe'
			}
		}
	})
})

avaTest('should change the remote username', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe',
					email: 'admin@souvlakitek.com',
					company: 'Souvlaki Tek'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username: 'johndoe123',
					email: 'admin@souvlakitek.com',
					company: 'Souvlaki Tek'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const oldUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const newUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe123')

	test.deepEqual(oldUsername.data, {
		email: 'admin@souvlakitek.com',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: oldUsername.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ],
		profile: {
			company: 'Souvlaki Tek'
		}
	})

	test.falsy(newUsername)
})

avaTest('should change the remote username while filling in the company', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username: 'johndoe123',
					company: 'Souvlaki Tek'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const oldUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const newUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe123')

	test.deepEqual(oldUsername.data, {
		email: 'new@change.me',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: oldUsername.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ],
		profile: {
			company: 'Souvlaki Tek'
		}
	})

	test.falsy(newUsername)
})

avaTest('should change the remote username while filling in the first name', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username: 'johndoe123',
					first_name: 'John'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const oldUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const newUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe123')

	test.deepEqual(oldUsername.data, {
		email: 'new@change.me',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: oldUsername.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ],
		profile: {
			name: {
				first: 'John'
			}
		}
	})

	test.falsy(newUsername)
})

avaTest('should change the remote username while filling in the last name', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username: 'johndoe123',
					last_name: 'Doe'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const oldUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const newUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe123')

	test.deepEqual(oldUsername.data, {
		email: 'new@change.me',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: oldUsername.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ],
		profile: {
			name: {
				last: 'Doe'
			}
		}
	})

	test.falsy(newUsername)
})

avaTest('should change the remote username while not changing anything else', async (test) => {
	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'create',
				payload: {
					id: 123,
					username: 'johndoe'
				}
			}
		},
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:26:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username: 'johndoe123'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
	}

	const oldUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe')

	const newUsername = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-johndoe123')

	test.deepEqual(oldUsername.data, {
		email: 'new@change.me',
		translateDate: '2019-04-17T15:26:45.231Z',
		roles: [ 'user-community' ],
		origin: oldUsername.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ]
	})

	test.falsy(newUsername)
})

avaTest('should add a company and email to an existing user', async (test) => {
	const username = uuid()
	const userCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `user-${username}`,
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'foo@bar.com',
			roles: []
		}
	})

	const patches = []

	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username,
					email: 'admin@souvlakitek.com',
					company: 'Souvlaki Tek'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
		patches.push(...result.data)
	}

	test.deepEqual(patches, [
		{
			id: userCard.id,
			slug: userCard.slug,
			type: 'user'
		}
	])

	const updatedCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, userCard.id)

	test.deepEqual(updatedCard.data, {
		email: 'admin@souvlakitek.com',
		translateDate: '2019-04-17T15:25:45.231Z',
		roles: [],
		origin: updatedCard.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ],
		profile: {
			company: 'Souvlaki Tek'
		}
	})
})

avaTest('should add a first name to an existing user', async (test) => {
	const username = uuid()
	const userCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `user-${username}`,
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'foo@bar.com',
			roles: []
		}
	})

	const patches = []

	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username,
					first_name: 'John'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
		patches.push(...result.data)
	}

	test.deepEqual(patches, [
		{
			id: userCard.id,
			slug: userCard.slug,
			type: 'user'
		}
	])

	const updatedCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, userCard.id)

	test.deepEqual(updatedCard.data, {
		email: 'foo@bar.com',
		roles: [],
		translateDate: '2019-04-17T15:25:45.231Z',
		origin: updatedCard.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ],
		profile: {
			name: {
				first: 'John'
			}
		}
	})
})

avaTest('should add a last name to an existing user', async (test) => {
	const username = uuid()
	const userCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `user-${username}`,
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'foo@bar.com',
			roles: []
		}
	})

	const patches = []

	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username,
					last_name: 'Doe'
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
		patches.push(...result.data)
	}

	test.deepEqual(patches, [
		{
			id: userCard.id,
			slug: userCard.slug,
			type: 'user'
		}
	])

	const updatedCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, userCard.id)

	test.deepEqual(updatedCard.data, {
		email: 'foo@bar.com',
		roles: [],
		translateDate: '2019-04-17T15:25:45.231Z',
		origin: updatedCard.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ],
		profile: {
			name: {
				last: 'Doe'
			}
		}
	})
})

avaTest('should link an existing user by adding no data', async (test) => {
	const username = uuid()
	const userCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: `user-${username}`,
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'foo@bar.com',
			roles: []
		}
	})

	const patches = []

	for (const externalEvent of [
		{
			headers: {
				accept: '*/*',
				connection: 'close',
				'content-type': 'application/json'
			},
			payload: {
				timestamp: '2019-04-17T15:25:45.231Z',
				resource: 'user',
				source: 'api.balena-cloud.com',
				type: 'update',
				payload: {
					id: 123,
					username
				}
			}
		}
	]) {
		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: `external-event-${uuid()}`,
				version: '1.0.0',
				data: await prepareEvent(externalEvent)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
		patches.push(...result.data)
	}

	test.deepEqual(patches, [
		{
			id: userCard.id,
			slug: userCard.slug,
			type: 'user'
		}
	])

	const updatedCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, userCard.id)

	test.deepEqual(updatedCard.data, {
		email: 'foo@bar.com',
		translateDate: '2019-04-17T15:25:45.231Z',
		roles: [],
		origin: updatedCard.data.origin,
		mirrors: [ 'https://api.balena-cloud.com/v5/user(123)' ]
	})
})

helpers.translate.scenario(TOKEN ? ava : ava.skip, {
	integration: require('../../../lib/sync/integrations/balena-api'),
	scenarios: require('./webhooks/balena-api'),
	baseUrl: 'https://api.balena-cloud.com',
	stubRegex: /.*/,
	source: 'balena-api',
	prepareEvent,
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		const params = querystring.parse(url.parse(request.path).query)
		return params.api_key === self.options.token.api &&
			params.api_username === self.options.token.username
	}
})

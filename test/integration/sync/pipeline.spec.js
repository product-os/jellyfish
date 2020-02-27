/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of  file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const uuid = require('uuid/v4')
const actionLibrary = require('../../../lib/action-library')
const helpers = require('../../helpers')
const typedErrors = require('typed-errors')
const pipeline = require('../../../lib/sync/pipeline')
const errors = require('../../../lib/sync/errors')
const NoOpIntegration = require('./noop-integration')
const syncContext = require('../../../lib/action-library/sync-context')

ava.beforeEach(async (test) => {
	const suffix = uuid()
	const dbName = `test_${suffix.replace(/-/g, '_')}`
	const context = { id: `CORE-TEST-${uuid()}` }

	const cache = await helpers.createCache({ dbName, context })
	const backend = await helpers.createBackend({ cache, dbName, context, options: { suffix } })
	const kernel = await helpers.createKernel(backend, context)
	const adminSession = kernel.sessions.admin
	const session = await kernel.getCardById(
		context, adminSession, adminSession)
	const actor = await kernel.getCardById(
		context, adminSession, session.data.actor)

	await kernel.insertCard(context, adminSession,
		require('../../../apps/server/default-cards/contrib/message.json'))
	await kernel.insertCard(context, adminSession,
		require('../../../apps/server/default-cards/contrib/role-user-community.json'))

	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-card'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-event'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-set-add'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-user'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-session'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-update-card'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-delete-card'].card)

	const queue = await helpers.createQueue({ context, kernel, session: adminSession })
	const queueActor = uuid()
	const dequeue = await helpers.dequeue({ queue, context, actor, queueActor })
	const worker = await helpers.createWorker({ kernel, adminSession, queue })
	const workerSyncContext = await syncContext.fromWorkerContext('test', worker.getActionContext(context), context, adminSession)
	test.context = {
		actor,
		worker,
		queue,
		kernel,
		backend,
		context,
		cache,
		syncContext: workerSyncContext,
		session: adminSession
	}
})

ava.afterEach((test) => {
	const { queue, kernel, backend, context, cache } = test.context
	queue.destroy()
	kernel.disconnect(context)
	backend.disconnect(context)
	cache.disconnect()
})

ava('.importCards() should import no card', async (test) => {
	const result = await pipeline.importCards(test.context.syncContext, [])

	test.deepEqual(result, [])
})

ava('.importCards() should throw if the type is invalid', async (test) => {
	await test.throwsAsync(pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				slug: 'hello-world',
				type: 'xxxxxxxxxxxxx@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		}
	]), test.context.worker.errors.WorkerNoElement)
})

ava('.importCards() should import a single card', async (test) => {
	const result = await pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				slug: 'hello-world',
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		}
	])

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: result[0].created_at,
			id: result[0].id,
			name: null,
			slug: 'hello-world',
			links: result[0].links,
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 1
			}
		})
	])
})

ava.only('.importCards() should patch an existing card', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.session, {
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		data: {
			test: 1
		}
	})

	const result = await pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: test.context.kernel.defaults({
				id: card.id,
				slug: 'foo',
				type: 'card@1.0.0',
				version: '1.0.0',
				active: false,
				data: {
					test: 1
				}
			})
		}
	])

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: card.created_at,
			updated_at: result[0].updated_at,
			id: card.id,
			name: null,
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			active: false,
			links: result[0].links,
			data: {
				test: 1
			}
		})
	])
})

ava('.importCards() should import two independent cards', async (test) => {
	const result = await pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'foo',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		},
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'bar',
				version: '1.0.0',
				data: {
					test: 2
				}
			}
		}
	])

	test.deepEqual(result, [
		{
			created_at: result[0].created_at,
			id: result[0].id,
			name: null,
			slug: 'foo',
			links: result[0].links,
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			created_at: result[1].created_at,
			id: result[1].id,
			name: null,
			slug: 'bar',
			links: result[1].links,
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 2
			}
		}
	].map(test.context.kernel.defaults))
})

ava('.importCards() should import two parallel cards', async (test) => {
	const result = await pipeline.importCards(test.context.syncContext, [
		[
			{
				time: new Date(),
				actor: test.context.actor.id,
				card: {
					type: 'card@1.0.0',
					slug: 'foo',
					version: '1.0.0',
					data: {
						test: 1
					}
				}
			},
			{
				time: new Date(),
				actor: test.context.actor.id,
				card: {
					type: 'card@1.0.0',
					slug: 'bar',
					version: '1.0.0',
					data: {
						test: 2
					}
				}
			}
		]
	])

	const sortedResult = _.sortBy(result, 'data.test')

	test.deepEqual(sortedResult, [
		{
			created_at: sortedResult[0].created_at,
			id: sortedResult[0].id,
			links: sortedResult[0].links,
			name: null,
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			created_at: sortedResult[1].created_at,
			id: sortedResult[1].id,
			links: sortedResult[1].links,
			name: null,
			slug: 'bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 2
			}
		}
	].map(test.context.kernel.defaults))
})

ava('.importCards() should import dependent cards', async (test) => {
	const result = await pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'foo',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		},
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'bar',
				version: '1.0.0',
				data: {
					target: {
						$eval: 'cards[0].id'
					}
				}
			}
		}
	])

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: result[0].created_at,
			id: result[0].id,
			active: true,
			name: null,
			slug: 'foo',
			links: result[0].links,
			markers: [],
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 1
			}
		}),
		test.context.kernel.defaults({
			created_at: result[1].created_at,
			id: result[1].id,
			active: true,
			name: null,
			slug: 'bar',
			links: result[1].links,
			markers: [],
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				target: result[0].id
			}
		})
	])
})

ava('.importCards() should not throw given string interpolation', async (test) => {
	const results = await pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'bar',
				version: '1.0.0',
				data: {
					// eslint-disable-next-line no-template-curly-in-string
					foo: 'Hello ${world}:$foo #{bar}'
				}
			}
		}
	])

	test.deepEqual(results, [
		test.context.jellyfish.defaults({
			id: results[0].id,
			slug: 'bar',
			created_at: results[0].created_at,
			name: null,
			type: 'card@1.0.0',
			data: {
				// eslint-disable-next-line no-template-curly-in-string
				foo: 'Hello ${world}:$foo #{bar}'
			}
		})
	])
})

ava('.importCards() should throw if a template does not evaluate', async (test) => {
	await test.throwsAsync(pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'foo',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		},
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'bar',
				version: '1.0.0',
				data: {
					target: {
						$eval: 'cards[0].hello'
					}
				}
			}
		}
	]), errors.SyncInvalidTemplate)
})

ava('.importCards() should import a dependent card in parallel segment', async (test) => {
	const result = await pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				type: 'card@1.0.0',
				slug: 'foo',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		},
		[
			{
				time: new Date(),
				actor: test.context.actor.id,
				card: {
					type: 'card@1.0.0',
					slug: 'bar',
					version: '1.0.0',
					data: {
						test: 2
					}
				}
			},
			{
				time: new Date(),
				actor: test.context.actor.id,
				card: {
					type: 'card@1.0.0',
					slug: 'baz',
					version: '1.0.0',
					data: {
						test: 3,
						target: {
							$eval: 'cards[0].id'
						}
					}
				}
			}
		]
	])

	const sortedResult = _.sortBy(result, 'data.test')

	test.deepEqual(sortedResult, [
		{
			created_at: sortedResult[0].created_at,
			id: sortedResult[0].id,
			links: sortedResult[0].links,
			name: null,
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			created_at: sortedResult[1].created_at,
			id: sortedResult[1].id,
			links: sortedResult[1].links,
			name: null,
			slug: 'bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 2
			}
		},
		{
			created_at: sortedResult[2].created_at,
			id: sortedResult[2].id,
			links: sortedResult[2].links,
			name: null,
			slug: 'baz',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				test: 3,
				target: sortedResult[0].id
			}
		}
	].map(test.context.kernel.defaults))
})

ava('.importCards() should add create events', async (test) => {
	const result = await pipeline.importCards(test.context.syncContext, [
		{
			time: new Date(),
			actor: test.context.actor.id,
			card: {
				slug: 'hello-world',
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		}
	])

	await test.context.flush(test.context.session)

	const timeline = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target' ],
				additionalProperties: true,
				properties: {
					target: {
						type: 'string',
						const: result[0].id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'create@1.0.0')
})

ava('.translateExternalEvent() should pass the originator to the sync context', async (test) => {
	class TestIntegration extends NoOpIntegration {
		constructor (options) {
			super(options)
			TestIntegration.instance = this
		}
	}

	const slug = test.context.generateRandomSlug({
		prefix: 'external-event'
	})

	const result = await pipeline.translateExternalEvent(
		TestIntegration, test.context.kernel.defaults({
			id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'external-event@1.0.0',
			slug,
			version: '1.0.0',
			data: {
				source: 'test',
				headers: {},
				payload: {
					actor: test.context.actor.id,
					foo: 'bar',
					bar: 'baz'
				}
			}
		}), {
			context: Object.assign({}, test.context.syncContext, {
				upsertElement: async (type, object, options) => {
					object.data.originator = options.originator
					return test.context.syncContext.upsertElement(type, object, options)
				}
			}),
			actor: test.context.actor.id
		})

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: result[0].created_at,
			id: result[0].id,
			slug,
			type: 'card@1.0.0',
			name: null,
			version: '1.0.0',
			links: result[0].links,
			data: {
				origin: result[0].data.origin,
				originator: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				payload: {
					actor: test.context.actor.id,
					foo: 'bar',
					bar: 'baz'
				}
			}
		})
	])
})

ava('.translateExternalEvent() should translate an external event through the noop integration', async (test) => {
	class TestIntegration extends NoOpIntegration {
		constructor (options) {
			super(options)
			TestIntegration.instance = this
		}
	}

	const slug = test.context.generateRandomSlug({
		prefix: 'external-event'
	})

	const result = await pipeline.translateExternalEvent(TestIntegration, test.context.kernel.defaults({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'external-event@1.0.0',
		slug,
		version: '1.0.0',
		data: {
			source: 'test',
			headers: {},
			payload: {
				actor: test.context.actor.id,
				foo: 'bar',
				bar: 'baz'
			}
		}
	}), {
		context: test.context.syncContext,
		actor: test.context.actor.id
	})

	test.true(TestIntegration.instance.initialized)
	test.true(TestIntegration.instance.destroyed)

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: result[0].created_at,
			id: result[0].id,
			slug,
			type: 'card@1.0.0',
			name: null,
			version: '1.0.0',
			links: result[0].links,
			data: {
				origin: result[0].data.origin,
				payload: {
					actor: test.context.actor.id,
					foo: 'bar',
					bar: 'baz'
				}
			}
		})
	])
})

ava('.translateExternalEvent() should destroy the integration even if there was an import error', async (test) => {
	class TestIntegration extends NoOpIntegration {
		constructor (options) {
			super(options)
			TestIntegration.instance = this
		}
	}

	await test.throwsAsync(pipeline.translateExternalEvent(TestIntegration, test.context.kernel.defaults({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: test.context.generateRandomSlug({
			prefix: 'external-event'
		}),
		type: 'invalid-type@1.0.0',
		version: '1.0.0',
		data: {
			source: 'test',
			headers: {},
			payload: {
				foo: {
					$eval: 'hello'
				},
				bar: 'baz'
			}
		}
	}), {
		context: test.context.syncContext,
		actor: test.context.actor.id
	}), errors.SyncInvalidTemplate)

	test.true(TestIntegration.instance.initialized)
	test.true(TestIntegration.instance.destroyed)
})

ava('.translateExternalEvent() should destroy the integration even if there was a translate error', async (test) => {
	const TranslateError = typedErrors.makeTypedError('TranslateError')
	class BrokenIntegration extends NoOpIntegration {
		constructor () {
			super()
			BrokenIntegration.instance = this
		}

		// eslint-disable-next-line class-methods-use-
		async translate () {
			throw new TranslateError('Foo Bar')
		}
	}

	await test.throwsAsync(pipeline.translateExternalEvent(BrokenIntegration, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'invalid-type@1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'external-event'
		}),
		version: '1.0.0',
		data: {
			source: 'test',
			headers: {},
			payload: {
				foo: {
					$eval: 'hello'
				},
				bar: 'baz'
			}
		}
	}, {
		context: test.context.syncContext,
		actor: test.context.actor.id
	}), TranslateError)

	test.true(BrokenIntegration.instance.initialized)
	test.true(BrokenIntegration.instance.destroyed)
})

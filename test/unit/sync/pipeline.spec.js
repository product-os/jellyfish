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
const _ = require('lodash')
const helpers = require('./helpers')
const typedErrors = require('typed-errors')
const pipeline = require('../../../lib/sync/pipeline')
const errors = require('../../../lib/sync/errors')
const NoOpIntegration = require('./noop-integration')

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

ava('.importCards() should import no card', async (test) => {
	const result = await pipeline.importCards(test.context.context, [], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [])
})

ava('.importCards() should throw if the type is invalid', async (test) => {
	await test.throwsAsync(pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: {
				slug: 'hello-world',
				type: 'xxxxxxxxxxxxx',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		}
	], {
		actor: test.context.actor.id
	}), test.context.worker.errors.WorkerNoElement)
})

ava('.importCards() should import a single card', async (test) => {
	const result = await pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: {
				slug: 'hello-world',
				type: 'card',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: result[0].created_at,
			id: result[0].id,
			slug: 'hello-world',
			links: result[0].links,
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		})
	])
})

ava('.importCards() should patch an existing card', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'card',
		slug: 'foo',
		version: '1.0.0',
		data: {
			test: 1
		}
	})

	const result = await pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: test.context.kernel.defaults({
				id: card.id,
				slug: 'foo',
				type: 'card',
				version: '1.0.0',
				active: false,
				data: {
					test: 1
				}
			})
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: card.created_at,
			id: card.id,
			slug: 'foo',
			type: 'card',
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
	const result = await pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: {
				type: 'card',
				slug: 'foo',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		},
		{
			time: new Date(),
			card: {
				type: 'card',
				slug: 'bar',
				version: '1.0.0',
				data: {
					test: 2
				}
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		{
			created_at: result[0].created_at,
			id: result[0].id,
			slug: 'foo',
			links: result[0].links,
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			created_at: result[1].created_at,
			id: result[1].id,
			slug: 'bar',
			links: result[1].links,
			type: 'card',
			version: '1.0.0',
			data: {
				test: 2
			}
		}
	].map(test.context.kernel.defaults))
})

ava('.importCards() should import two parallel cards', async (test) => {
	const result = await pipeline.importCards(test.context.context, [
		[
			{
				time: new Date(),
				card: {
					type: 'card',
					slug: 'foo',
					version: '1.0.0',
					data: {
						test: 1
					}
				}
			},
			{
				time: new Date(),
				card: {
					type: 'card',
					slug: 'bar',
					version: '1.0.0',
					data: {
						test: 2
					}
				}
			}
		]
	], {
		actor: test.context.actor.id
	})

	const sortedResult = _.sortBy(result, 'data.test')

	test.deepEqual(sortedResult, [
		{
			created_at: sortedResult[0].created_at,
			id: sortedResult[0].id,
			links: sortedResult[0].links,
			slug: 'foo',
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			created_at: sortedResult[1].created_at,
			id: sortedResult[1].id,
			links: sortedResult[1].links,
			slug: 'bar',
			type: 'card',
			version: '1.0.0',
			data: {
				test: 2
			}
		}
	].map(test.context.kernel.defaults))
})

ava('.importCards() should import dependent cards', async (test) => {
	const result = await pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: {
				type: 'card',
				slug: 'foo',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		},
		{
			time: new Date(),
			card: {
				type: 'card',
				slug: 'bar',
				version: '1.0.0',
				data: {
					target: {
						$eval: 'cards[0].id'
					}
				}
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: result[0].created_at,
			id: result[0].id,
			active: true,
			slug: 'foo',
			links: result[0].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		}),
		test.context.kernel.defaults({
			created_at: result[1].created_at,
			id: result[1].id,
			active: true,
			slug: 'bar',
			links: result[1].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				target: result[0].id
			}
		})
	])
})

ava('.importCards() should throw if a template does not evaluate', async (test) => {
	await test.throwsAsync(pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: {
				type: 'card',
				slug: 'foo',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		},
		{
			time: new Date(),
			card: {
				type: 'card',
				slug: 'bar',
				version: '1.0.0',
				data: {
					target: {
						$eval: 'cards[0].hello'
					}
				}
			}
		}
	], {
		actor: test.context.actor.id
	}), errors.SyncInvalidTemplate)
})

ava('.importCards() should import a dependent card in parallel segment', async (test) => {
	const result = await pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: {
				type: 'card',
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
				card: {
					type: 'card',
					slug: 'bar',
					version: '1.0.0',
					data: {
						test: 2
					}
				}
			},
			{
				time: new Date(),
				card: {
					type: 'card',
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
	], {
		actor: test.context.actor.id
	})

	const sortedResult = _.sortBy(result, 'data.test')

	test.deepEqual(sortedResult, [
		{
			created_at: sortedResult[0].created_at,
			id: sortedResult[0].id,
			links: sortedResult[0].links,
			slug: 'foo',
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			created_at: sortedResult[1].created_at,
			id: sortedResult[1].id,
			links: sortedResult[1].links,
			slug: 'bar',
			type: 'card',
			version: '1.0.0',
			data: {
				test: 2
			}
		},
		{
			created_at: sortedResult[2].created_at,
			id: sortedResult[2].id,
			links: sortedResult[2].links,
			slug: 'baz',
			type: 'card',
			version: '1.0.0',
			data: {
				test: 3,
				target: sortedResult[0].id
			}
		}
	].map(test.context.kernel.defaults))
})

ava('.importCards() should add create events', async (test) => {
	const result = await pipeline.importCards(test.context.context, [
		{
			time: new Date(),
			card: {
				slug: 'hello-world',
				type: 'card',
				version: '1.0.0',
				data: {
					test: 1
				}
			}
		}
	], {
		actor: test.context.actor.id
	})

	await test.context.flush(test.context.session)

	const [ cardWithEvents ] = await test.context.jellyfish.query(test.context.session, {
		$$links: {
			'has attached element': {
				type: 'object',
				additionalProperties: true
			}
		},
		type: 'object',
		additionalProperties: true,
		required: [ 'id' ],
		properties: {
			id: {
				type: 'string',
				const: result[0].id
			},
			type: {
				type: 'string',
				const: result[0].type
			}
		}
	})

	const timeline = cardWithEvents.links['has attached element']

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'create')
})

ava('.translateExternalEvent() should translate an external event through the noop integration', async (test) => {
	class TestIntegration extends NoOpIntegration {
		constructor () {
			super()
			TestIntegration.instance = this
		}
	}

	const slug = test.context.generateRandomSlug({
		prefix: 'external-event'
	})

	const result = await pipeline.translateExternalEvent(TestIntegration, test.context.kernel.defaults({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'external-event',
		slug,
		version: '1.0.0',
		data: {
			source: 'test',
			headers: {},
			payload: {
				foo: 'bar',
				bar: 'baz'
			}
		}
	}), {
		context: test.context.context,
		actor: test.context.actor.id
	})

	test.true(TestIntegration.instance.initialized)
	test.true(TestIntegration.instance.destroyed)

	test.deepEqual(result, [
		test.context.kernel.defaults({
			created_at: result[0].created_at,
			id: result[0].id,
			slug,
			type: 'card',
			version: '1.0.0',
			links: result[0].links,
			data: {
				payload: {
					foo: 'bar',
					bar: 'baz'
				}
			}
		})
	])
})

ava('.translateExternalEvent() should destroy the integration even if there was an import error', async (test) => {
	class TestIntegration extends NoOpIntegration {
		constructor () {
			super()
			TestIntegration.instance = this
		}
	}

	await test.throwsAsync(pipeline.translateExternalEvent(TestIntegration, test.context.kernel.defaults({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: test.context.generateRandomSlug({
			prefix: 'external-event'
		}),
		type: 'invalid-type',
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
		context: test.context.context,
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

		// eslint-disable-next-line class-methods-use-this
		async translate () {
			throw new TranslateError('Foo Bar')
		}
	}

	await test.throwsAsync(pipeline.translateExternalEvent(BrokenIntegration, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'invalid-type',
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
		context: test.context.context,
		actor: test.context.actor.id
	}), TranslateError)

	test.true(BrokenIntegration.instance.initialized)
	test.true(BrokenIntegration.instance.destroyed)
})

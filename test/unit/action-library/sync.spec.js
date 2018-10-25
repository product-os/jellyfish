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
const sync = require('../../../lib/action-library/sync')
const NoOpIntegration = require('./noop-integration')

ava.test.beforeEach(helpers.sync.beforeEach)
ava.test.afterEach(helpers.sync.afterEach)

ava.test('.importCards() should import no card', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [])
})

ava.test('.importCards() should throw if the type is invalid', async (test) => {
	await test.throws(sync.importCards(test.context.context, test.context.session, [
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

ava.test('.importCards() should import a single card', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
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
		{
			id: result[0].id,
			slug: 'hello-world',
			active: true,
			links: result[0].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		}
	])
})

ava.test('.importCards() should import a single card with an id', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			time: new Date(),
			card: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
		{
			id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			slug: 'hello-world',
			active: true,
			links: result[0].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		}
	])
})

ava.test('.importCards() should patch an existing card', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		markers: [],
		tags: [],
		data: {
			test: 1
		}
	})

	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			time: new Date(),
			card: {
				id: card.id,
				type: 'card',
				version: '1.0.0',
				active: false,
				links: {},
				markers: [],
				tags: [],
				data: {
					test: 1
				}
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		{
			id: card.id,
			type: 'card',
			version: '1.0.0',
			active: false,
			links: result[0].links,
			markers: [],
			tags: [],
			data: {
				test: 1
			}
		}
	])
})

ava.test('.importCards() should import two independent cards', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			time: new Date(),
			card: {
				type: 'card',
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
			id: result[0].id,
			active: true,
			links: result[0].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			id: result[1].id,
			active: true,
			links: result[1].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 2
			}
		}
	])
})

ava.test('.importCards() should import two parallel cards', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		[
			{
				time: new Date(),
				card: {
					type: 'card',
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
			id: sortedResult[0].id,
			active: true,
			links: sortedResult[0].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			id: sortedResult[1].id,
			active: true,
			links: sortedResult[1].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 2
			}
		}
	])
})

ava.test('.importCards() should import dependent cards', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			time: new Date(),
			card: {
				type: 'card',
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
		{
			id: result[0].id,
			active: true,
			links: result[0].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			id: result[1].id,
			active: true,
			links: result[1].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				target: result[0].id
			}
		}
	])
})

ava.test('.importCards() should throw if a template does not evaluate', async (test) => {
	await test.throws(sync.importCards(test.context.context, test.context.session, [
		{
			time: new Date(),
			card: {
				type: 'card',
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
	}), test.context.worker.errors.WorkerInvalidTemplate)
})

ava.test('.importCards() should import a dependent card in parallel segment', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			time: new Date(),
			card: {
				type: 'card',
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
			id: sortedResult[0].id,
			active: true,
			links: sortedResult[0].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 1
			}
		},
		{
			id: sortedResult[1].id,
			active: true,
			links: sortedResult[1].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 2
			}
		},
		{
			id: sortedResult[2].id,
			active: true,
			links: sortedResult[2].links,
			markers: [],
			tags: [],
			type: 'card',
			version: '1.0.0',
			data: {
				test: 3,
				target: sortedResult[0].id
			}
		}
	])
})

ava.test('.importCards() should add create events', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
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

	const timeline = await test.context.jellyfish.query(test.context.session, {
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
	test.is(timeline[0].type, 'create')
})

ava.test('.translateExternalEvent() should translate an external event through the noop integration', async (test) => {
	class TestIntegration extends NoOpIntegration {
		constructor () {
			super()
			TestIntegration.instance = this
		}
	}

	const result = await sync.translateExternalEvent(TestIntegration, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'external-event',
		version: '1.0.0',
		active: true,
		markers: [],
		tags: [],
		links: {},
		data: {
			source: 'test',
			headers: {},
			payload: {
				foo: 'bar',
				bar: 'baz'
			}
		}
	}, {
		context: test.context.context,
		session: test.context.session,
		actor: test.context.actor.id
	})

	test.true(TestIntegration.instance.initialized)
	test.true(TestIntegration.instance.destroyed)

	test.deepEqual(result, [
		{
			id: result[0].id,
			type: 'card',
			version: '1.0.0',
			active: true,
			markers: [],
			tags: [],
			links: result[0].links,
			data: {
				payload: {
					foo: 'bar',
					bar: 'baz'
				}
			}
		}
	])
})

ava.test('.translateExternalEvent() should destroy the integration even if there was an import error', async (test) => {
	class TestIntegration extends NoOpIntegration {
		constructor () {
			super()
			TestIntegration.instance = this
		}
	}

	await test.throws(sync.translateExternalEvent(TestIntegration, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'invalid-type',
		version: '1.0.0',
		active: true,
		markers: [],
		tags: [],
		links: {},
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
		session: test.context.session,
		actor: test.context.actor.id
	}), test.context.worker.errors.WorkerInvalidTemplate)

	test.true(TestIntegration.instance.initialized)
	test.true(TestIntegration.instance.destroyed)
})

ava.test('.translateExternalEvent() should destroy the integration even if there was a translate error', async (test) => {
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

	await test.throws(sync.translateExternalEvent(BrokenIntegration, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'invalid-type',
		version: '1.0.0',
		active: true,
		markers: [],
		tags: [],
		links: {},
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
		session: test.context.session,
		actor: test.context.actor.id
	}), TranslateError)

	test.true(BrokenIntegration.instance.initialized)
	test.true(BrokenIntegration.instance.destroyed)
})

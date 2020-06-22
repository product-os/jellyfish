/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)
})

ava.after(helpers.worker.after)

ava('.setTriggers() should be able to set a trigger with a start date', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			startDate: '2008-01-01T00:00:00.000Z',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			startDate: '2008-01-01T00:00:00.000Z',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should be able to set a trigger with an interval', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			interval: 'PT1H',
			arguments: {
				foo: 'bar'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			interval: 'PT1H',
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should be able to set triggers', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			async: true,
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			slug: 'triggered-action-foo-baz',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			type: 'card@1.0.0',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'baz'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			async: true,
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			slug: 'triggered-action-foo-baz',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'baz'
			}
		}
	])
})

ava('.setTriggers() should not store extra properties', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			foo: 'bar',
			bar: 'baz',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should store a mode', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			mode: 'update',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			mode: 'update',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should throw if no interval nor filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if mode is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 'action-foo-bar@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				mode: 1,
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if both interval and filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				interval: 'PT1H',
				filter: {
					type: 'object'
				},
				action: 'action-create-card@1.0.0',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no id', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				slug: 'triggered-action-foo-bar',
				action: 'action-create-card@1.0.0',
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no slug', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if id is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 999,
				slug: 'triggered-action-foo-bar',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if interval is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				interval: 999,
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no action', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if action is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 1,
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no target', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 'action-create-card@1.0.0',
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if target is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 'action-create-card@1.0.0',
				target: 1,
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if filter is not an object', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: 'foo',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no arguments', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if arguments is not an object', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				async: true,
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				slug: 'triggered-action-foo-bar',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				},
				arguments: 1
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.upsertTrigger() should be able to add a trigger', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])

	test.context.worker.upsertTrigger(test.context.context, {
		async: true,
		id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
		slug: 'triggered-action-foo-baz',
		action: 'action-foo-bar@1.0.0',
		target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
		type: 'card@1.0.0',
		filter: {
			type: 'object'
		},
		arguments: {
			foo: 'baz'
		}
	})

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			async: true,
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			slug: 'triggered-action-foo-baz',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'baz'
			}
		}
	])
})

ava('.upsertTrigger() should be able to modify an existing trigger', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			async: true,
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			slug: 'triggered-action-foo-baz',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			type: 'card@1.0.0',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'baz'
			}
		}
	])

	test.context.worker.upsertTrigger(test.context.context, {
		async: true,
		id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
		slug: 'triggered-action-foo-baz',
		action: 'action-foo-bar@1.0.0',
		target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
		type: 'card@1.0.0',
		filter: {
			type: 'object'
		},
		arguments: {
			baz: 'buzz'
		}
	})

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			async: true,
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			slug: 'triggered-action-foo-baz',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			filter: {
				type: 'object'
			},
			arguments: {
				baz: 'buzz'
			}
		}
	])
})

ava('.removeTrigger() should be able to remove an existing trigger', (test) => {
	const cards = [
		{
			async: true,
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			async: true,
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			slug: 'triggered-action-foo-baz',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			type: 'card@1.0.0',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'baz'
			}
		}
	]

	test.context.worker.setTriggers(test.context.context, cards)

	test.context.worker.removeTrigger(test.context.context, cards[1].slug)

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		cards[0]
	])
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuidv4
} = require('uuid')
const helpers = require('../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

ava('Should generate a notification if subscribed view filter matches inserted card', async (test) => {
	const {
		sdk
	} = test.context

	const identifier = uuidv4()

	const view = await sdk.card.create({
		name: 'Foos',
		type: 'view@1.0.0',
		slug: `view-all-foos-${uuidv4()}`,
		data: {
			allOf: [
				{
					name: 'All foos',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'card@1.0.0'
							},
							data: {
								properties: {
									baz: {
										const: identifier
									}
								},
								required: [
									'baz'
								]
							}
						},
						additionalProperties: true,
						required: [
							'type',
							'data'
						]
					}
				}
			]
		}
	})

	const subscription = await sdk.card.create({
		slug: `subscription-${uuidv4()}`,
		name: 'Subscription to foo',
		type: 'subscription@1.0.0',
		data: {}
	})

	await sdk.card.link(view, subscription, 'has attached')

	const card = await sdk.card.create({
		type: 'card@1.0.0',
		slug: `card-${uuidv4()}`,
		data: {
			baz: identifier
		}
	})

	const notification = await test.context.waitForMatch({
		type: 'object',
		properties: {
			type: {
				const: 'notification@1.0.0'
			}
		},
		required: [
			'type'
		],
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: card.id
					}
				},
				required: [
					'id'
				]
			}
		}
	})

	test.truthy(notification)
})

ava('Should not generate a notification if subscribed view filter does not match inserted card', async (test) => {
	const {
		sdk
	} = test.context

	const identifier = uuidv4()

	const view = await sdk.card.create({
		name: 'Foos',
		type: 'view@1.0.0',
		slug: `view-all-foos-${uuidv4()}`,
		data: {
			allOf: [
				{
					name: 'All foos',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'card@1.0.0'
							},
							data: {
								properties: {
									baz: {
										const: identifier
									}
								},
								required: [
									'baz'
								]
							}
						},
						additionalProperties: true,
						required: [
							'type',
							'data'
						]
					}
				}
			]
		}
	})

	const subscription = await sdk.card.create({
		slug: `subscription-${uuidv4()}`,
		name: 'Subscription to foo',
		type: 'subscription@1.0.0',
		data: {}
	})

	await sdk.card.link(view, subscription, 'has attached')

	const card = await sdk.card.create({
		type: 'card@1.0.0',
		slug: `card-${uuidv4()}`,
		data: {
			baz: 'foobarbaz'
		}
	})

	await test.throwsAsync(test.context.waitForMatch({
		type: 'object',
		properties: {
			type: {
				const: 'notification@1.0.0'
			}
		},
		required: [
			'type'
		],
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: card.id
					}
				},
				required: [
					'id'
				]
			}
		}
	}, 3))
})

ava('Should not generate a notification if view is not subscribed, but filter matches inserted card', async (test) => {
	const {
		sdk
	} = test.context

	const identifier = uuidv4()

	await sdk.card.create({
		name: 'Foos',
		type: 'view@1.0.0',
		slug: `view-all-foos-${uuidv4()}`,
		data: {
			allOf: [
				{
					name: 'All foos',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'card@1.0.0'
							},
							data: {
								properties: {
									baz: {
										const: identifier
									}
								},
								required: [
									'baz'
								]
							}
						},
						additionalProperties: true,
						required: [
							'type',
							'data'
						]
					}
				}
			]
		}
	})

	const card = await sdk.card.create({
		type: 'card@1.0.0',
		slug: `card-${uuidv4()}`,
		data: {
			baz: identifier
		}
	})

	await test.throwsAsync(test.context.waitForMatch({
		type: 'object',
		properties: {
			type: {
				const: 'notification@1.0.0'
			}
		},
		required: [
			'type'
		],
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: card.id
					}
				},
				required: [
					'id'
				]
			}
		}
	}, 3))
})

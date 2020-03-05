/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.afterEach(helpers.worker.afterEach)

ava('.insertCard() should pass a triggered action originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-test-originator@1.0.0',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo-bar-baz',
					version: '1.0.0'
				}
			}
		}
	])

	await test.context.worker.insertCard(
		test.context.context, test.context.session, typeCard, {
			timestamp: new Date().toISOString(),
			actor: test.context.actor.id,
			attachEvents: true
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@1.0.0')
	test.is(card.data.originator, 'cb3523c5-b37d-41c8-ae32-9e7cc9309165')
})

ava('.insertCard() should take an originator option', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-test-originator@1.0.0',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	await test.context.worker.insertCard(
		test.context.context, test.context.session, typeCard, {
			timestamp: new Date().toISOString(),
			actor: test.context.actor.id,
			originator: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			attachEvents: true
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@latest')
	test.is(card.data.originator, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.afterEach(helpers.worker.afterEach)

ava('should delete a card using action-delete-card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const deleteRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-delete-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {}
	})

	await test.context.flush(test.context.session)
	const deleteResult = await test.context.queue.producer.waitResults(
		test.context.context, deleteRequest)
	test.false(deleteResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, deleteResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: deleteResult.data.id,
		name: null,
		version: '1.0.0',
		slug: 'foo',
		type: 'card@1.0.0',
		active: false,
		links: card.links
	}))
})

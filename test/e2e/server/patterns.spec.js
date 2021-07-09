/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

ava('should set pattern status to partially-resolved if an attached improvement is released', async (test) => {
	const {
		sdk
	} = test.context
	const pattern = await sdk.card.create({
		name: 'My pattern',
		type: 'pattern',
		version: '1.0.0',
		data: {
			status: 'improvement-in-progress'
		}
	})

	const improvement = await sdk.card.create({
		name: 'My improvement',
		type: 'improvement',
		version: '1.0.0',
		data: {
			status: 'merged'
		}
	})

	await sdk.card.link(pattern, improvement, 'has attached')

	// Release the improvement, and then wait for the pattern status to be updated
	await sdk.card.update(improvement.id, improvement.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'released'
		}
	])

	const newPattern = await test.context.waitForMatch({
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				const: pattern.id
			},
			data: {
				type: 'object',
				required: [ 'status' ],
				properties: {
					status: {
						const: 'partially-resolved'
					}
				}
			}
		}
	})

	test.is(newPattern.data.status, 'partially-resolved')
})

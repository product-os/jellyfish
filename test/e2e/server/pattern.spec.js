/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const helpers = require('../sdk/helpers')

const addLinkedImprovement = async (sdk, pattern) => {
	const improvement = await sdk.card.create({
		name: `Improvement ${uuid()}`,
		type: 'improvement',
		data: {
			status: 'proposed'
		}
	})

	await sdk.card.link(pattern, improvement, 'has attached')
	return improvement
}

const completeImprovement = async (sdk, improvement) => {
	await sdk.card.update(improvement.id, improvement.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'completed'
		}
	])
}

const waitForPatternStatus = async (context, pattern, percentComplete, status) => {
	return context.waitForMatch({
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				const: pattern.id
			},
			data: {
				type: 'object',
				required: [ 'status', 'improvementsPercentComplete' ],
				properties: {
					status: {
						const: status
					},
					improvementsPercentComplete: {
						const: percentComplete
					}
				}
			}
		}
	})
}

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

ava(
	// eslint-disable-next-line max-len
	'should set pattern status to "partially-resolved" and then to "resolved-pending-review" as attached improvements are completed',
	async (test) => {
		const {
			sdk
		} = test.context

		const pattern = await sdk.card.create({
			name: `Pattern ${uuid()}`,
			type: 'pattern',
			version: '1.0.0',
			data: {
				status: 'improvement-in-progress'
			}
		})

		// Add two improvements, linked to this pattern
		const improvement1 = await addLinkedImprovement(sdk, pattern)
		const improvement2 = await addLinkedImprovement(sdk, pattern)

		// Complete the first improvement, and then wait for the pattern % completed and status to be updated
		await completeImprovement(sdk, improvement1)
		let updatedPattern = await waitForPatternStatus(test.context, pattern, 50, 'partially-resolved')
		test.is(updatedPattern.data.status, 'partially-resolved')
		test.is(updatedPattern.data.improvementsPercentComplete, 50)

		// Now complete the second improvement and wait for the pattern % complete and status to be updated again
		await completeImprovement(sdk, improvement2)
		updatedPattern = await waitForPatternStatus(test.context, pattern, 100, 'resolved-pending-review')
		test.is(updatedPattern.data.status, 'resolved-pending-review')
		test.is(updatedPattern.data.improvementsPercentComplete, 100)
	})

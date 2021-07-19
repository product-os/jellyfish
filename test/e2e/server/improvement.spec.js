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

const addLinkedMilestone = async (sdk, improvement) => {
	const milestone = await sdk.card.create({
		name: `Milestone ${uuid()}`,
		type: 'milestone@1.0.0',
		data: {
			status: 'open'
		}
	})

	await sdk.card.link(improvement, milestone, 'has attached')
	return milestone
}

const completeMilestone = async (sdk, milestone) => {
	await sdk.card.update(milestone.id, milestone.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'completed'
		}
	])
}

const waitForPatternStatus = async (context, improvement, percentComplete, status) => {
	return context.waitForMatch({
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				const: improvement.id
			},
			data: {
				type: 'object',
				required: [ 'status', 'milestonesPercentComplete' ],
				properties: {
					status: {
						const: status
					},
					milestonesPercentComplete: {
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
	'should set improvement status to "completed" when all attached milestones are completed',
	async (test) => {
		const {
			sdk
		} = test.context

		const improvement = await sdk.card.create({
			name: `Improvement ${uuid()}`,
			type: 'improvement@1.0.0',
			version: '1.0.0',
			data: {
				status: 'implementation'
			}
		})

		// Add two milestones, linked to this improvement
		const milestone1 = await addLinkedMilestone(sdk, improvement)
		const milestone2 = await addLinkedMilestone(sdk, improvement)

		// Complete the first milestone, and verify the improvement % progess is updated but the status is not updated
		await completeMilestone(sdk, milestone1)
		let updatedImprovement = await waitForPatternStatus(test.context, improvement, 50, 'implementation')
		test.is(updatedImprovement.data.status, 'implementation')
		test.is(updatedImprovement.data.milestonesPercentComplete, 50)

		// Now complete the second milestone and wait for the improvement % complete and status to be updated again
		await completeMilestone(sdk, milestone2)
		updatedImprovement = await waitForPatternStatus(test.context, improvement, 100, 'completed')
		test.is(updatedImprovement.data.status, 'completed')
		test.is(updatedImprovement.data.milestonesPercentComplete, 100)
	})

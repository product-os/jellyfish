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

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

const createUserDetails = () => {
	return {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial(
	'transformer properties should evaluate with formulas and triggers',
	async (test) => {
		const {
			sdk
		} = test.context

		const user1Details = createUserDetails()

		// Create user 1 and login as them
		await sdk.action({
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				username: `user-${user1Details.username}`,
				email: user1Details.email,
				password: user1Details.password
			}
		})

		await sdk.auth.login(user1Details)

		await sdk.auth.whoami()

		const src1 = await sdk.card.create({
			type: 'service-source@1.0.0',
			data: {
				logme: true
			}
		})

		const src2 = await sdk.card.create({
			type: 'service-source@1.0.0',
			data: {
				logme: true
			}
		})
		await sdk.card.link(src1, src2, 'was built into')

		console.log(`testing contracts ${src1.id} -[was built into-> ${src2.id}`)

		const src1final = await sdk.card.create({
			type: 'service-source@1.0.0'
		})
		await sdk.card.link(src1, src1final, 'was merged as')

		const src2test = await test.context.waitForMatch(
			{
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						const: src2.id
					},
					data: {
						type: 'object',
						required: [ '$transformer' ],
						properties: {
							$transformer: {
								type: 'object',
								required: [ 'parentMerged' ],
								properties: {
									parentMerged: {
										const: true
									}
								}
							}
						}
					}
				}
			},
			4
		)

		test.is(src2test.id, src2.id)
	}
)

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const randomWords = require('random-words')
const helpers = require('../sdk/helpers')
const environment = require('@balena/jellyfish-environment').defaultEnvironment

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

const generateRandomWords = (number) => {
	return randomWords(number).join(' ')
}

// TODO: These cases test the behaviour of a number triggered actions that are part of the
// default plugin, and should be tested alongside the plugin instead of here
ava('linking a support thread to an issue results in a message on that issue\'s timeline', async (test) => {
	const issue = await test.context.sdk.card.create({
		name: `Test Issue: ${randomWords(3)}`,
		type: 'issue',
		data: {
			repository: environment.test.integration.github.repo,
			description: generateRandomWords(5),
			status: 'open',
			archived: false
		}
	})

	const supportThread = await test.context.sdk.card.create({
		type: 'support-thread',
		name: 'test subject',
		data: {
			product: 'test-product',
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})

	await test.context.sdk.card.link(supportThread, issue, 'support thread is attached to issue')

	await test.context.waitForMatch({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				const: 'message@1.0.0'
			},
			data: {
				type: 'object',
				required: [ 'payload' ],
				properties: {
					payload: {
						type: 'object',
						required: [ 'message' ],
						properties: {
							message: {
								regexp: {
									pattern: 'This issue has attached support thread'
								}
							}
						}
					}
				}
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id' ],
				properties: {
					id: {
						const: issue.id
					}
				}
			}
		}
	})

	// If the wait query resolved, the message was generated successfully
	test.pass()
})

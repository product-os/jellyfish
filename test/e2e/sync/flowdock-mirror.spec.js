/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.flowdock

ava.before(async (test) => {
	await helpers.mirror.before(test)

	test.context.createSupportThread = async () => {
		const result = await test.context.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
		return test.context.sdk.getById(result.id, {
			type: 'support-thread'
		})
	}
})

ava.after(helpers.mirror.after)
ava.beforeEach(async (test) => {
	await helpers.mirror.beforeEach(test, uuid())
})

ava.afterEach(helpers.mirror.afterEach)

// Skip all tests if any Flowdock environment variable is missing
const avaTest = !TOKEN.api || !TOKEN.flowToken ? ava.skip : ava.serial

avaTest('should send an activity message based on the support thread card', async (test) => {
	const supportThread = test.context.createSupportThread()

	// TODO: Verify the flowdock message was created
	test.pass()
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const ExpireArray = require('../../../lib/queue/expire-array')

ava('array element is deleted once timeout expires', async (test) => {
	const expireArray = new ExpireArray(100)
	expireArray.push('test element')
	test.truthy(expireArray.includes('test element'))

	await Bluebird.delay(500)

	test.false(expireArray.includes('test element'))
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const uuid = require('../../../lib/uuid')

ava('.isUUID() should return true for a uuid', async (test) => {
	test.true(uuid.isUUID(await uuid.random()))
})

ava('.isUUID() should return false if input is not a complete uuid', async (test) => {
	test.false(uuid.isUUID((await uuid.random()).slice(0, 10)))
})

ava('REGEX should be a regular expression', (test) => {
	test.true(_.isRegExp(uuid.REGEX))
})

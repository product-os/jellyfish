/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const uuid = require('../../../lib/uuid')

ava('REGEX should be a regular expression', (test) => {
	test.true(_.isRegExp(uuid.REGEX))
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const assert = require('assert')
const environment = require('../environment')

// This will be evaluated once, and then
// cached by the module system, so future
// requires won't have to do this check

if (environment.isProduction()) {
	for (const fn of Object.keys(assert)) {
		exports[fn] = _.noop
	}
} else {
	module.exports = assert
}

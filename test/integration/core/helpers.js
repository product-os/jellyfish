/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const helpers = require('./backend/helpers')
const Kernel = require('../../../lib/core/kernel')

const generateRandomSlug = (options) => {
	const suffix = uuid()
	if (options.prefix) {
		return `${options.prefix}-${suffix}`
	}

	return suffix
}

exports.beforeEach = async (test, options = {}) => {
	await helpers.beforeEach(test, {
		skipConnect: true,
		suffix: options.suffix
	})

	if (options.suffix) {
		await test.context.backend.connect(test.context.context)
		await test.context.backend.reset(test.context.context)
	}

	test.context.kernel = new Kernel(test.context.backend)
	await test.context.kernel.initialize(test.context.context)
	test.context.generateRandomSlug = generateRandomSlug
}

exports.afterEach = async (test) => {
	await test.context.backend.drop(test.context.context)
	await test.context.kernel.disconnect(test.context.context)
	await helpers.afterEach(test)
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const environment = require('../../../../lib/environment')
const Cache = require('../../../../lib/core/cache')

exports.beforeEach = async (test) => {
	test.context.cache = new Cache(
		Object.assign({}, environment.redis, {
			namespace: `test_${uuid()}`
		}))

	await test.context.cache.connect()
}

exports.afterEach = async (test) => {
	await test.context.cache.disconnect()
}

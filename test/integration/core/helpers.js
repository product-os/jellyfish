/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const Backend = require('../../../lib/core/backend')
const environment = require('../../../lib/environment')
const Cache = require('../../../lib/core/cache')
const Kernel = require('../../../lib/core/kernel')
const errors = require('../../../lib/core/errors')

exports.generateRandomSlug = (options) => {
	const suffix = uuid()
	if (options.prefix) {
		return `${options.prefix}-${suffix}`
	}

	return suffix
}

exports.backend = {
	beforeEach: async (test, options = {}) => {
		const dbName = `test_${uuid().replace(/-/g, '_')}`

		if (environment.cache.disable) {
			test.context.cache = null
		} else if (environment.redis.disable) {
			test.context.cache = new Cache({
				mock: true,
				namespace: dbName
			})
		} else {
			test.context.cache = new Cache(
				Object.assign({}, environment.getRedisConfiguration(), {
					namespace: dbName
				}))
		}

		test.context.context = {
			id: `CORE-TEST-${uuid()}`
		}

		if (test.context.cache) {
			await test.context.cache.connect(test.context.context)
		}

		test.context.backend = new Backend(
			test.context.cache, errors, Object.assign({}, environment.database.options, {
				database: dbName
			}))

		test.context.generateRandomSlug = exports.generateRandomSlug

		if (options.skipConnect) {
			return
		}

		await test.context.backend.connect(test.context.context)
	},
	afterEach: async (test) => {
		/*
		 * We can just disconnect and not destroy the whole
		 * database as test databases are destroyed before
		 * the next test run anyways.
		 */
		await test.context.backend.disconnect(test.context.context)

		if (test.context.cache) {
			await test.context.cache.disconnect()
		}
	}
}

exports.kernel = {
	beforeEach: async (test) => {
		await exports.backend.beforeEach(test, {
			skipConnect: true
		})

		test.context.kernel = new Kernel(test.context.backend)
		await test.context.kernel.initialize(test.context.context)
	},
	afterEach: async (test) => {
		await test.context.kernel.disconnect(test.context.context)
		await exports.backend.afterEach(test)
	}
}

exports.jellyfish = {
	beforeEach: async (test) => {
		await exports.kernel.beforeEach(test)
		test.context.jellyfish = test.context.kernel
	},
	afterEach: async (test) => {
		await exports.kernel.afterEach(test)
	}
}

exports.cache = {
	beforeEach: async (test) => {
		if (environment.redis.disable) {
			test.context.cache = new Cache({
				mock: true,
				namespace: `test_${uuid()}`
			})
		} else {
			test.context.cache = new Cache(
				Object.assign({}, environment.getRedisConfiguration(), {
					namespace: `test_${uuid()}`
				}))
		}

		await test.context.cache.connect()
	},
	afterEach: async (test) => {
		await test.context.cache.disconnect()
	}
}

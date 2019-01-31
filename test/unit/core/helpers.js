/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const randomstring = require('randomstring')
const Backend = require('../../../lib/core/backend')
const environment = require('../../../lib/environment')
const Cache = require('../../../lib/core/cache')
const Kernel = require('../../../lib/core/kernel')

exports.generateRandomSlug = (options) => {
	const suffix = randomstring.generate().toLowerCase()
	if (options.prefix) {
		return `${options.prefix}-${suffix}`
	}

	return suffix
}

exports.backend = {
	beforeEach: async (test, options = {}) => {
		const dbName = `test_${randomstring.generate()}`

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
			id: `CORE-TEST-${randomstring.generate(20)}`
		}

		if (test.context.cache) {
			await test.context.cache.connect(test.context.context)
		}

		test.context.backend = new Backend(
			test.context.cache, Object.assign({}, environment.database, {
				database: dbName
			}))

		test.context.generateRandomSlug = exports.generateRandomSlug

		if (options.skipConnect) {
			return
		}

		await test.context.backend.connect(test.context.context)
	},
	afterEach: async (test) => {
		await test.context.backend.destroy(test.context.context)

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
				namespace: `test_${randomstring.generate()}`
			})
		} else {
			test.context.cache = new Cache(
				Object.assign({}, environment.getRedisConfiguration(), {
					namespace: `test_${randomstring.generate()}`
				}))
		}

		await test.context.cache.connect()
	},
	afterEach: async (test) => {
		await test.context.cache.disconnect()
	}
}

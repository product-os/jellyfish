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
const Cache = require('../../../lib/core/cache')
const Kernel = require('../../../lib/core/kernel')

exports.backend = {
	beforeEach: async (test) => {
		const cache = new Cache()
		test.context.backend = new Backend(cache, {
			host: process.env.DB_HOST,
			port: process.env.DB_PORT,
			database: `test_${randomstring.generate()}`
		})

		await test.context.backend.connect()
	},
	afterEach: async (test) => {
		await test.context.backend.destroy()
	}
}

exports.kernel = {
	beforeEach: async (test) => {
		await exports.backend.beforeEach(test)
		test.context.kernel = new Kernel(test.context.backend)

		await test.context.kernel.initialize()
	},
	afterEach: async (test) => {
		await test.context.kernel.disconnect()
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
		test.context.cache = new Cache()
		await test.context.cache.connect()
	},
	afterEach: async (test) => {
		await test.context.cache.reset()
	}
}

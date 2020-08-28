/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Backend = require('@balena/jellyfish-core/lib/backend')
const Cache = require('@balena/jellyfish-core/lib/cache')
const environment = require('@balena/jellyfish-environment')
const errors = require('@balena/jellyfish-core/lib/errors')
const Kernel = require('@balena/jellyfish-core/lib/kernel')
const uuid = require('@balena/jellyfish-uuid')
const utils = require('./utils')

const backendBefore = async (test, options = {}) => {
	const suffix = options.suffix || await uuid.random()
	const dbName = `test_${suffix.replace(/-/g, '_')}`

	test.context.cache = new Cache(
		Object.assign({}, environment.redis, {
			namespace: dbName
		}))

	test.context.context = {
		id: `CORE-TEST-${await uuid.random()}`
	}

	if (test.context.cache) {
		await test.context.cache.connect(test.context.context)
	}

	test.context.backend = new Backend(
		test.context.cache,
		errors,
		Object.assign({}, environment.database.options, {
			database: dbName
		}))

	if (options.skipConnect) {
		return
	}

	await test.context.backend.connect(test.context.context)
}

const backendAfter = async (test) => {
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

exports.before = async (test, options = {}) => {
	await backendBefore(test, {
		skipConnect: true,
		suffix: options.suffix
	})

	if (options.suffix) {
		await test.context.backend.connect(test.context.context)
		await test.context.backend.reset(test.context.context)
	}

	test.context.kernel = new Kernel(test.context.backend)
	await test.context.kernel.initialize(test.context.context)
	test.context.generateRandomSlug = utils.generateRandomSlug
	test.context.generateRandomID = utils.generateRandomID
}

exports.after = async (test) => {
	await test.context.backend.drop(test.context.context)
	await test.context.kernel.disconnect(test.context.context)
	await backendAfter(test)
}

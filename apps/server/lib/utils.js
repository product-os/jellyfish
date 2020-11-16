/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const core = require('@balena/jellyfish-core')
const environment = require('@balena/jellyfish-environment')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)

/**
 * @summary Set up and return cache instance
 * @function
 *
 * @param {Object} context - execution context
 * @returns {Object} backend cache instance
 */
exports.setupCache = async (context) => {
	logger.info(context, 'Setting up cache')
	const cache = new core.MemoryCache(environment.redis)
	if (cache) {
		await cache.connect(context)
	}
	return cache
}

/**
 * @summary Set up and return backend core instance
 * @function
 *
 * @param {Object} context - execution context
 * @param {Object} cache - backend cache instance
 * @param {Object} options - optional parameters
 * @returns {Object} backend core instance
 */
exports.setupCore = async (context, cache, options = {}) => {
	logger.info(context, 'Instantiating core library')
	const backendOptions = (options.database) ? Object.assign({}, environment.database.options, options.database)
		: environment.database.options
	const jellyfish = await core.create(context, cache, {
		backend: backendOptions
	})
	return jellyfish
}

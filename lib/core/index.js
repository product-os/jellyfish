/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Kernel = require('./kernel')
const Backend = require('./backend')
const Cache = require('./cache')

exports.MemoryCache = Cache

exports.create = async (context, cache, options) => {
	const backend = new Backend(cache, options.backend)
	const kernel = new Kernel(backend)
	await kernel.initialize(context)
	return kernel
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const plugins = require('../../lib/plugins')

const TEST_CONTEXT = {
	id: 'TEST_SERVER-ERROR'
}

ava('plugins can be loaded', (test) => {
	test.notThrows(() => {
		const loadedPlugins = plugins.loadPlugins({
			context: TEST_CONTEXT
		})
		test.true(loadedPlugins.length > 0)
	})
})

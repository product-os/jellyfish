/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const DefaultPlugin = require('@balena/jellyfish-plugin-default')

const loadPlugin = (Plugin, options) => {
	try {
		const plugin = new Plugin(options)

		// TODO: validate plugin
		return plugin
	} catch (err) {
		console.log(err)
		logger.error(options.context, 'Failed to load plugin', err)
		return null
	}
}

exports.loadPlugins = (options = {}) => {
	return _.compact([
		DefaultPlugin
	].map((Plugin) => {
		return loadPlugin(Plugin, options)
	}))
}

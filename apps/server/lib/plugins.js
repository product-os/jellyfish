/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const {
	PluginManager
} = require('@balena/jellyfish-plugin-base')
const ActionLibrary = require('@balena/jellyfish-action-library')
const DefaultPlugin = require('@balena/jellyfish-plugin-default')
const ProductOSPlugin = require('@balena/jellyfish-plugin-product-os')

exports.getPluginManager = (context) => {
	logger.info(context, 'Loading plugins')
	return new PluginManager(context, {
		plugins: [
			ActionLibrary,
			DefaultPlugin,
			ProductOSPlugin
		]
	})
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const {
	PluginManager
} = require('@balena/jellyfish-plugin-base')
const {
	ChannelsPlugin
} = require('@balena/jellyfish-plugin-channels')
const ActionLibrary = require('@balena/jellyfish-action-library')
const {
	DefaultPlugin
} = require('@balena/jellyfish-plugin-default')
const {
	ProductOsPlugin
} = require('@balena/jellyfish-plugin-product-os')
const {
	TypeformPlugin
} = require('@balena/jellyfish-plugin-typeform')
const {
	GitHubPlugin
} = require('@balena/jellyfish-plugin-github')
const {
	FlowdockPlugin
} = require('@balena/jellyfish-plugin-flowdock')
const {
	DiscoursePlugin
} = require('@balena/jellyfish-plugin-discourse')
const {
	OutreachPlugin
} = require('@balena/jellyfish-plugin-outreach')
const {
	FrontPlugin
} = require('@balena/jellyfish-plugin-front')
const {
	BalenaAPIPlugin
} = require('@balena/jellyfish-plugin-balena-api')

exports.getPluginManager = (context) => {
	logger.info(context, 'Loading plugins')
	return new PluginManager(context, {
		plugins: [
			ActionLibrary,
			DefaultPlugin,
			ChannelsPlugin,
			ProductOsPlugin,
			TypeformPlugin,
			GitHubPlugin,
			FlowdockPlugin,
			DiscoursePlugin,
			OutreachPlugin,
			FrontPlugin,
			BalenaAPIPlugin
		]
	})
}

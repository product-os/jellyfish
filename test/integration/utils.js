/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	v4: uuid
} = require('uuid')
const coreMixins = require('@balena/jellyfish-core/lib/cards/mixins')
const {
	getPluginManager
} = require('../../apps/server/lib/plugins')

const pluginManagerContext = {
	id: 'jellyfish-integration-test'
}

const pluginManager = getPluginManager(pluginManagerContext)

exports.loadCards = (context) => {
	const allCards = pluginManager.getCards(context, coreMixins)
	allCards['action-test-originator'] = Object.assign({}, allCards['action-create-card'], {
		slug: 'action-test-originator'
	})
	return allCards
}

exports.loadSyncIntegrations = (context) => {
	return pluginManager.getSyncIntegrations(context)
}

exports.loadActions = (context) => {
	const allActions = pluginManager.getActions(context)
	Object.assign(allActions, {
		'action-test-originator': {
			handler: async (session, ctx, card, request) => {
				request.arguments.properties.data = request.arguments.properties.data || {}
				request.arguments.properties.data.originator = request.originator
				return allActions['action-create-card']
					.handler(session, ctx, card, request)
			}
		}
	})
	return allActions
}

exports.generateRandomID = () => {
	return uuid()
}

exports.generateRandomSlug = (options = {}) => {
	const slug = exports.generateRandomID()
	if (options.prefix) {
		return `${options.prefix}-${slug}`
	}

	return slug
}

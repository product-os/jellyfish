/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const {
	cardMixins
} = require('@balena/jellyfish-core')
const {
	getPluginManager
} = require('../../lib/plugins')

const context = {
	id: `UNIT-TEST-${uuid()}`
}

ava('Plugin Manager loads plugins', (test) => {
	const pluginManager = getPluginManager(context)

	const cards = pluginManager.getCards(context, cardMixins)
	test.is(cards.account.slug, 'account')

	const integrations = pluginManager.getSyncIntegrations(context)
	test.is(integrations.front.slug, 'front')
})

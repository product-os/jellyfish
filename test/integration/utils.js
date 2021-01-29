/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	v4: uuid
} = require('uuid')
const coreMixins = require('@balena/jellyfish-core/lib/cards/mixins')
const DefaultPlugin = require('@balena/jellyfish-plugin-default')

const plugin = new DefaultPlugin()

exports.loadDefaultCards = (context) => {
	return plugin.getCards(context, coreMixins)
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

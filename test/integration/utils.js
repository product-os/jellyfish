/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	v4: uuid
} = require('uuid')
const coreMixins = require('@balena/jellyfish-core/lib/cards/mixins')
const loadDefaultCards = require('@balena/jellyfish-plugin-default').loadCards

exports.loadDefaultCards = () => {
	return loadDefaultCards(coreMixins)
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

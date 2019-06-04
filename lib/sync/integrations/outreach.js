/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')

module.exports = class OutreachIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
	}

	// eslint-disable-next-line class-methods-use-this
	async initialize () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async destroy () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async mirror (card, options) {
		return []
	}

	// eslint-disable-next-line class-methods-use-this
	async translate (event) {
		return []
	}
}

module.exports.OAUTH_BASE_URL = 'https://api.outreach.io'

// Don't take any external webhooks yet
module.exports.isEventValid = _.constant(false)

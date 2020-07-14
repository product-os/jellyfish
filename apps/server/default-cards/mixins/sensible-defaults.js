/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

const DEFAULTS = {
	version: '1.0.0',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {},
	requires: [],
	capabilities: []
}

// Reverse merge the default fields into the source card.
module.exports = (sourceCard) => {
	return _.merge(DEFAULTS, sourceCard)
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const withEvents = require('./with-events')
const withIsPending = require('./with-is-pending')
const withBaseSupportView = require('./with-view-support-base')

const uiSchemaDef = (key) => {
	return `node_modules/@balena/jellyfish-core/lib/cards/mixins/ui-schema-defs.json#/${key}`
}

module.exports = {
	uiSchemaDef,
	withIsPending,
	withBaseSupportView,
	withEvents: withEvents({
		uiSchemaDef
	})
}


/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const core = require('../core')
const store = require('../core/store')

exports.createLink = (fromCard, toCard, verb, options = {}) => {
	return core.sdk.card.link(fromCard, toCard, verb)
		.tap(() => {
			core.analytics.track('element.create', {
				element: {
					type: 'link'
				}
			})
		})
		.tap(() => {
			if (!options.skipSuccessMessage) {
				core.store.dispatch(store.actionCreators.addNotification('success', 'Created new link'))
			}
		})
		.catch((error) => {
			core.store.dispatch(store.actionCreators.addNotification('danger', error.message))
		})
}

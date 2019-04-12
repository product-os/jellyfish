
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const {
	actionCreators,
	analytics,
	store,
	sdk
} = require('../core')

exports.createLink = (fromCard, toCard, verb, options = {}) => {
	return sdk.card.link(fromCard, toCard, verb)
		.tap(() => {
			analytics.track('element.create', {
				element: {
					type: 'link'
				}
			})
		})
		.tap(() => {
			if (!options.skipSuccessMessage) {
				store.dispatch(actionCreators.addNotification('success', 'Created new link'))
			}
		})
		.catch((error) => {
			store.dispatch(actionCreators.addNotification('danger', error.message))
		})
}

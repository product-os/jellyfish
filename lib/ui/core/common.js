
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const helpers = require('../services/helpers')

exports.getDefaultState = () => {
	return {
		core: {
			status: 'initializing',
			channels: [
				helpers.createChannel({
					target: 'view-all-views',
					cardType: 'view'
				})
			],
			types: [],
			session: null,
			notifications: [],
			viewNotices: {},
			allUsers: [],
			accounts: [],
			orgs: [],
			config: {},
			ui: {
				sidebar: {
					expanded: []
				}
			}
		},
		views: {
			viewData: {},
			subscriptions: {},
			activeView: null
		}
	}
}

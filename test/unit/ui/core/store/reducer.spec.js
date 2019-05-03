/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const ava = require('ava')
const actions = require('../../../../../lib/ui/core/store/actions').default
const {
	reducer
} = require('../../../../../lib/ui/core/store/reducer')

ava('reducer should create a default state if one is not provided', (test) => {
	const initialState = reducer()

	test.deepEqual(initialState, {
		core: {
			status: 'initializing',
			channels: [
				{
					id: initialState.core.channels[0].id,
					created_at: initialState.core.channels[0].created_at,
					slug: initialState.core.channels[0].slug,
					type: 'channel',
					version: '1.0.0',
					tags: [],
					markers: [],
					links: {},
					requires: [],
					capabilities: [],
					active: true,
					data: {
						target: 'view-all-views',
						cardType: 'view'
					}
				}
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
				},
				timelines: {}
			}
		},
		views: {
			viewData: {},
			subscriptions: {}
		}
	})
})

ava('REMOVE_VIEW_DATA_ITEM action should do nothing if there is no view data', (test) => {
	const initialState = reducer()

	const newState = reducer(initialState, {
		type: actions.REMOVE_VIEW_DATA_ITEM,
		value: {
			id: 12345
		}
	})

	test.deepEqual(initialState, newState)
})

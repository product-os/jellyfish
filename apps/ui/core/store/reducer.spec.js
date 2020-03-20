/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const ava = require('ava')
const actions = require('./actions').default
const {
	reducer
} = require('./reducer')

// //////////////////////////////////////////////
// Views Reducer Tests

ava('SET_VIEW_DATA action updates the specified view data', (test) => {
	const initialState = reducer()
	const value = {
		id: 12345,
		data: {
			foo: 'bar'
		}
	}

	const newState = reducer(initialState, {
		type: actions.SET_VIEW_DATA,
		value
	})

	test.deepEqual(newState.views.viewData[value.id], value.data)
})

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
			cards: {},
			orgs: [],
			config: {},
			ui: {
				sidebar: {
					expanded: []
				},
				timelines: {},
				chatWidget: {
					open: false
				}
			}
		},
		views: {
			activeView: null,
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

ava('REMOVE_VIEW_DATA_ITEM action removes the specified view data item', (test) => {
	const initialState = reducer()
	const viewId = 12345
	const dataToRemove = {
		id: 21
	}
	const dataToKeep = {
		id: 'bar'
	}
	initialState.views.viewData[viewId] = [
		dataToRemove,
		dataToKeep
	]

	const newState = reducer(initialState, {
		type: actions.REMOVE_VIEW_DATA_ITEM,
		value: {
			id: viewId,
			data: dataToRemove
		}
	})

	test.deepEqual(newState.views.viewData[viewId], [ dataToKeep ])
})

ava('UPSERT_VIEW_DATA_ITEM action adds the specified view data item if not already in list', (test) => {
	const initialState = reducer()
	const viewId = 12345
	const initialViewDataItem = {
		id: 'bar'
	}
	const newViewDataItem = {
		id: 'foo'
	}
	initialState.views.viewData[viewId] = [
		initialViewDataItem
	]
	const value = {
		id: 12345,
		data: newViewDataItem
	}

	const newState = reducer(initialState, {
		type: actions.UPSERT_VIEW_DATA_ITEM,
		value
	})

	test.deepEqual(newState.views.viewData[value.id], [ initialViewDataItem, newViewDataItem ])
})

ava('UPSERT_VIEW_DATA_ITEM action updates the specified view data item if already in list', (test) => {
	const initialState = reducer()
	const viewId = 12345
	const initialViewDataItem = {
		id: 'bar',
		foo: 'a'
	}
	const newViewDataItem = {
		id: 'bar',
		foo: 'b'
	}
	initialState.views.viewData[viewId] = [
		initialViewDataItem
	]
	const value = {
		id: 12345,
		data: newViewDataItem
	}

	const newState = reducer(initialState, {
		type: actions.UPSERT_VIEW_DATA_ITEM,
		value
	})

	test.deepEqual(newState.views.viewData[value.id], [ newViewDataItem ])
})

ava('APPEND_VIEW_DATA_ITEM action appends the specified view data item', (test) => {
	const initialState = reducer()
	const viewId = 12345
	const initialViewDataItem = {
		id: 'bar'
	}
	const newViewDataItem = {
		id: 'foo'
	}
	initialState.views.viewData[viewId] = [
		initialViewDataItem
	]
	const value = {
		id: 12345,
		data: newViewDataItem
	}

	const newState = reducer(initialState, {
		type: actions.APPEND_VIEW_DATA_ITEM,
		value
	})

	test.deepEqual(newState.views.viewData[value.id], [ initialViewDataItem, newViewDataItem ])
})

ava('APPEND_VIEW_DATA_ITEM action ignores the specified view data item if it already exists', (test) => {
	const initialState = reducer()
	const viewId = 12345
	const initialViewDataItem = {
		id: 'bar',
		foo: 'a'
	}
	const newViewDataItem = {
		id: 'bar',
		foo: 'b'
	}
	initialState.views.viewData[viewId] = [
		initialViewDataItem
	]
	const value = {
		id: 12345,
		data: newViewDataItem
	}

	const newState = reducer(initialState, {
		type: actions.APPEND_VIEW_DATA_ITEM,
		value
	})

	test.deepEqual(newState.views.viewData[value.id], [ initialViewDataItem ])
})

// //////////////////////////////////////////////
// Core Reducer Tests

ava('UPDATE_CHANNEL action overrides the specified channel if found', (test) => {
	const initialState = reducer()
	initialState.core.channels = [
		{
			id: 1,
			foo: 'bar'
		}
	]
	const updatedChannel = {
		id: 1,
		v1: 'test'
	}

	const newState = reducer(initialState, {
		type: actions.UPDATE_CHANNEL,
		value: updatedChannel
	})

	test.deepEqual(newState.core.channels, [ updatedChannel ])
})

ava('UPDATE_CHANNEL action does nothing if channel not found in state', (test) => {
	const initialState = reducer()
	initialState.core.channels = [
		{
			id: 1,
			foo: 'bar'
		}
	]
	const updatedChannel = {
		id: 2,
		v1: 'test'
	}

	const newState = reducer(initialState, {
		type: actions.UPDATE_CHANNEL,
		value: updatedChannel
	})

	test.deepEqual(newState.core.channels, initialState.core.channels)
})

ava('ADD_CHANNEL action adds channel and trims non-parent channels', (test) => {
	const initialState = reducer()
	initialState.core.channels = [
		{
			id: 1,
			name: 'a'
		},
		{
			id: 2,
			name: 'b'
		}
	]
	const newChannel = {
		id: 3,
		name: 'c',
		data: {
			parentChannel: 1
		}
	}

	const newState = reducer(initialState, {
		type: actions.ADD_CHANNEL,
		value: newChannel
	})

	test.deepEqual(newState.core.channels, [
		{
			id: 1,
			name: 'a'
		},
		newChannel
	])
})

ava('REMOVE_CHANNEL action removes the specified channel', (test) => {
	const initialState = reducer()
	initialState.core.channels = [
		{
			id: 1
		},
		{
			id: 2
		}
	]

	const newState = reducer(initialState, {
		type: actions.REMOVE_CHANNEL,
		value: {
			id: 1
		}
	})

	test.deepEqual(newState.core.channels, [
		{
			id: 2
		}
	])
})

ava('SET_CARD action overwrites the specified card', (test) => {
	const initialState = reducer()
	initialState.core.cards = {
		user: {
			1: {
				id: 1,
				type: 'user',
				name: 'test'
			},
			2: {
				id: 2,
				type: 'user'
			}
		}
	}

	const newState = reducer(initialState, {
		type: actions.SET_CARD,
		value: {
			id: 1,
			type: 'user',
			foo: 'bar'
		}
	})

	test.deepEqual(newState.core.cards, {
		user: {
			1: {
				id: 1,
				type: 'user',
				foo: 'bar'
			},
			2: {
				id: 2,
				type: 'user'
			}
		}
	})
})

ava('SET_USER action sets the authToken to null if not already set', (test) => {
	const initialState = reducer()

	test.is(initialState.core.session, null)

	const newState = reducer(initialState, {
		type: actions.SET_USER,
		value: 1
	})

	test.deepEqual(newState.core.session, {
		authToken: null,
		user: 1
	})
})

ava('SET_TIMELINE_MESSAGE action sets the message of the specified timeline', (test) => {
	const initialState = reducer()

	const newState = reducer(initialState, {
		type: actions.SET_TIMELINE_MESSAGE,
		value: {
			target: 2,
			message: 'test'
		}
	})

	test.deepEqual(newState.core.ui.timelines, {
		2: {
			message: 'test'
		}
	})
})

ava('ADD_NOTIFICATION action limits notifications to two', (test) => {
	const initialState = reducer()
	initialState.core.notifications = [
		{
			id: 1
		},
		{
			id: 2
		}
	]
	const newState = reducer(initialState, {
		type: actions.ADD_NOTIFICATION,
		value: {
			id: 3
		}
	})

	test.deepEqual(newState.core.notifications, [
		{
			id: 2
		},
		{
			id: 3
		}
	])
})

ava('REMOVE_NOTIFICATION action removes the corresponding notification', (test) => {
	const initialState = reducer()
	initialState.core.notifications = [
		{
			id: 1
		},
		{
			id: 2
		}
	]
	const newState = reducer(initialState, {
		type: actions.REMOVE_NOTIFICATION,
		value: 1
	})

	test.deepEqual(newState.core.notifications, [
		{
			id: 2
		}
	])
})

ava('SET_LENS_STATE action merges the specified lens state', (test) => {
	const initialState = reducer()
	const lens = 1
	const cardId = 2
	initialState.core.ui.lensState = {
		[lens]: {
			[cardId]: {
				var1: 'value1',
				var2: 'value2'
			}
		}
	}
	const newState = reducer(initialState, {
		type: actions.SET_LENS_STATE,
		value: {
			lens,
			cardId,
			state: {
				var1: 'value1New',
				var3: 'value3'
			}
		}
	})

	test.deepEqual(newState.core.ui.lensState, {
		[lens]: {
			[cardId]: {
				var1: 'value1New',
				var2: 'value2',
				var3: 'value3'
			}
		}
	})
})

ava('USER_STARTED_TYPING action adds the user to the usersTyping for that card', (test) => {
	const initialState = reducer()
	const newState = reducer(initialState, {
		type: actions.USER_STARTED_TYPING,
		value: {
			card: 2,
			user: 'test'
		}
	})

	test.deepEqual(newState.core.usersTyping, {
		2: {
			test: true
		}
	})
})

ava('USER_STOPPED_TYPING action removes the user from the usersTyping for that card', (test) => {
	const initialState = reducer()
	initialState.core.usersTyping = {
		2: {
			test1: true,
			test2: true
		}
	}
	const newState = reducer(initialState, {
		type: actions.USER_STOPPED_TYPING,
		value: {
			card: 2,
			user: 'test1'
		}
	})

	test.deepEqual(newState.core.usersTyping, {
		2: {
			test2: true
		}
	})
})

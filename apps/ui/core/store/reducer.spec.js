/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const ava = require('ava')
const _ = require('lodash')
const actions = require('./actions').default
const {
	reducer,
	defaultState
} = require('./reducer')

// //////////////////////////////////////////////
// Views Reducer Tests

ava('SET_VIEW_DATA action updates the specified view data', (test) => {
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)

	const {
		core,
		views
	} = _.cloneDeep(defaultState)

	// Hard-wire the values that are dynamically set
	core.channels[0] = _.merge(core.channels[0], {
		created_at: initialState.core.channels[0].created_at,
		id: initialState.core.channels[0].id,
		slug: initialState.core.channels[0].slug
	})
	test.deepEqual(initialState.core, core)
	test.deepEqual(initialState.views, views)
})

ava('REMOVE_VIEW_DATA_ITEM action should do nothing if there is no view data', (test) => {
	const initialState = _.cloneDeep(defaultState)

	const newState = reducer(initialState, {
		type: actions.REMOVE_VIEW_DATA_ITEM,
		value: {
			id: 12345
		}
	})

	test.deepEqual(initialState.views, newState.views)
})

ava('REMOVE_VIEW_DATA_ITEM action removes the specified view data item', (test) => {
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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

ava('SET_CARD action merges the specified card', (test) => {
	const initialState = _.cloneDeep(defaultState)
	initialState.core.cards = {
		user: {
			1: {
				id: 1,
				type: 'user',
				name: 'test',
				links: {
					'is member of': [
						{
							slug: 'org-balena'
						}
					]
				}
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
			foo: 'bar',
			links: {
				'has attached element': [
					{
						slug: 'some-card'
					}
				]
			}
		}
	})

	test.deepEqual(newState.core.cards, {
		user: {
			1: {
				id: 1,
				type: 'user',
				name: 'test',
				foo: 'bar',
				links: {
					'is member of': [
						{
							slug: 'org-balena'
						}
					],
					'has attached element': [
						{
							slug: 'some-card'
						}
					]
				}
			},
			2: {
				id: 2,
				type: 'user'
			}
		}
	})
})

ava('SET_USER action sets the authToken to null if not already set', (test) => {
	const initialState = _.cloneDeep(defaultState)

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
	const initialState = _.cloneDeep(defaultState)

	const newState = reducer(initialState, {
		type: actions.SET_TIMELINE_MESSAGE,
		value: {
			target: 2,
			message: 'test'
		}
	})

	test.deepEqual(newState.ui.timelines, {
		2: {
			message: 'test'
		}
	})
})

ava('ADD_NOTIFICATION action limits notifications to two', (test) => {
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
	const lens = 1
	const cardId = 2
	initialState.ui.lensState = {
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

	test.deepEqual(newState.ui.lensState, {
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
	const initialState = _.cloneDeep(defaultState)
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
	const initialState = _.cloneDeep(defaultState)
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

ava('SET_FLOW adds flow state if it doesn\'t already exist', (test) => {
	const initialState = _.cloneDeep(defaultState)
	const flowId = 'HANDOVER'
	const cardId = '3'
	const flowStateUpdates = {
		someItem: 'someValue'
	}

	const newState = reducer(initialState, {
		type: actions.SET_FLOW,
		value: {
			flowId,
			cardId,
			flowState: flowStateUpdates
		}
	})

	test.deepEqual(newState.ui.flows, {
		[flowId]: {
			[cardId]: {
				someItem: 'someValue'
			}
		}
	})
})

ava('SET_FLOW merges an existing flow state', (test) => {
	const initialState = _.cloneDeep(defaultState)
	const flowId = 'HANDOVER'
	const cardId = '3'
	const flowState = {
		isOpen: true,
		valA: 'initial'
	}
	initialState.ui.flows = {
		[flowId]: {
			[cardId]: flowState
		}
	}
	const flowStateUpdates = {
		valA: 'changed'
	}

	const newState = reducer(initialState, {
		type: actions.SET_FLOW,
		value: {
			flowId,
			cardId,
			flowState: flowStateUpdates
		}
	})

	test.deepEqual(newState.ui.flows, {
		[flowId]: {
			[cardId]: {
				isOpen: true,
				valA: 'changed'
			}
		}
	})
})

ava('REMOVE_FLOW removes flow state', (test) => {
	const initialState = _.cloneDeep(defaultState)
	const flowId = 'HANDOVER'
	const cardId = '3'
	const flowState = {
		isOpen: true
	}
	initialState.ui.flows = {
		[flowId]: {
			[cardId]: flowState
		}
	}

	const newState = reducer(initialState, {
		type: actions.REMOVE_FLOW,
		value: {
			flowId,
			cardId
		}
	})

	test.deepEqual(newState.ui.flows, {
		[flowId]: {}
	})
})

ava('SET_GROUPS identifies groups that the given user is part of', (test) => {
	const userSlug = 'user-1'
	const groups = [
		{
			name: 'group1',
			links: {
				'has group member': [
					{
						slug: userSlug
					}
				]
			}
		},
		{
			name: 'group2',
			links: {
				'has group member': [
					{
						slug: 'another-user'
					}
				]
			}
		}
	]
	const initialState = _.cloneDeep(defaultState)
	const newState = reducer(initialState, {
		type: actions.SET_GROUPS,
		value: {
			groups,
			userSlug
		}
	})
	test.deepEqual(newState.core.groups, {
		group1: {
			name: 'group1',
			users: [ userSlug ],
			isMine: true
		},
		group2: {
			name: 'group2',
			users: [ 'another-user' ],
			isMine: false
		}
	})
})

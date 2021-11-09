/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import _ from 'lodash';
import actions from './actions';
import { reducer, defaultState } from './reducer';

describe('Redux store reducers - views', () => {
	test('SET_VIEW_DATA action updates the specified view data', () => {
		const initialState = _.cloneDeep(defaultState);
		const value = {
			id: 12345,
			data: {
				foo: 'bar',
			},
		};

		const newState = reducer(initialState, {
			type: actions.SET_VIEW_DATA,
			value,
		});

		expect(newState.views.viewData[value.id]).toEqual(value.data);
	});

	test('reducer should create a default state if one is not provided', () => {
		const initialState = _.cloneDeep(defaultState);

		const { core, views } = _.cloneDeep(defaultState);

		// Hard-wire the values that are dynamically set
		core.channels[0] = _.merge(core.channels[0], {
			created_at: initialState.core.channels[0].created_at,
			id: initialState.core.channels[0].id,
			slug: initialState.core.channels[0].slug,
		});
		expect(initialState.core).toEqual(core);
		expect(initialState.views).toEqual(views);
	});

	test('REMOVE_VIEW_DATA_ITEM action should do nothing if there is no view data', () => {
		const initialState = _.cloneDeep(defaultState);

		const newState = reducer(initialState, {
			type: actions.REMOVE_VIEW_DATA_ITEM,
			value: {
				id: 12345,
			},
		});

		expect(initialState.views).toEqual(newState.views);
	});

	test('REMOVE_VIEW_DATA_ITEM action removes the specified view data item', () => {
		const initialState = _.cloneDeep(defaultState);
		const viewId = 12345;
		const dataToRemove = {
			id: 21,
		};
		const dataToKeep = {
			id: 'bar',
		};
		initialState.views.viewData[viewId] = [dataToRemove, dataToKeep];

		const newState = reducer(initialState, {
			type: actions.REMOVE_VIEW_DATA_ITEM,
			value: {
				id: viewId,
				itemId: dataToRemove.id,
			},
		});

		expect(newState.views.viewData[viewId]).toEqual([dataToKeep]);
	});

	test('UPSERT_VIEW_DATA_ITEM action adds the specified view data item if not already in list', () => {
		const initialState = _.cloneDeep(defaultState);
		const viewId = 12345;
		const initialViewDataItem = {
			id: 'bar',
		};
		const newViewDataItem = {
			id: 'foo',
		};
		initialState.views.viewData[viewId] = [initialViewDataItem];
		const value = {
			id: 12345,
			data: newViewDataItem,
		};

		const newState = reducer(initialState, {
			type: actions.UPSERT_VIEW_DATA_ITEM,
			value,
		});

		expect(newState.views.viewData[value.id]).toEqual([
			initialViewDataItem,
			newViewDataItem,
		]);
	});

	test('UPSERT_VIEW_DATA_ITEM action updates the specified view data item if already in list', () => {
		const initialState = _.cloneDeep(defaultState);
		const viewId = 12345;
		const initialViewDataItem = {
			id: 'bar',
			foo: 'a',
		};
		const newViewDataItem = {
			id: 'bar',
			foo: 'b',
		};
		initialState.views.viewData[viewId] = [initialViewDataItem];
		const value = {
			id: 12345,
			data: newViewDataItem,
		};

		const newState = reducer(initialState, {
			type: actions.UPSERT_VIEW_DATA_ITEM,
			value,
		});

		expect(newState.views.viewData[value.id]).toEqual([newViewDataItem]);
	});

	test('APPEND_VIEW_DATA_ITEM action appends the specified view data item', () => {
		const initialState = _.cloneDeep(defaultState);
		const viewId = 12345;
		const initialViewDataItem = {
			id: 'bar',
		};
		const newViewDataItem = {
			id: 'foo',
		};
		initialState.views.viewData[viewId] = [initialViewDataItem];
		const value = {
			id: 12345,
			data: newViewDataItem,
		};

		const newState = reducer(initialState, {
			type: actions.APPEND_VIEW_DATA_ITEM,
			value,
		});

		expect(newState.views.viewData[value.id]).toEqual([
			initialViewDataItem,
			newViewDataItem,
		]);
	});

	test('APPEND_VIEW_DATA_ITEM action ignores the specified view data item if it already exists', () => {
		const initialState = _.cloneDeep(defaultState);
		const viewId = 12345;
		const initialViewDataItem = {
			id: 'bar',
			foo: 'a',
		};
		const newViewDataItem = {
			id: 'bar',
			foo: 'b',
		};
		initialState.views.viewData[viewId] = [initialViewDataItem];
		const value = {
			id: 12345,
			data: newViewDataItem,
		};

		const newState = reducer(initialState, {
			type: actions.APPEND_VIEW_DATA_ITEM,
			value,
		});

		expect(newState.views.viewData[value.id]).toEqual([initialViewDataItem]);
	});
});

describe('Redux store reducers - core', () => {
	test('UPDATE_CHANNEL action overrides the specified channel if found', () => {
		const initialState = _.cloneDeep(defaultState);
		initialState.core.channels = [
			{
				id: 1,
				foo: 'bar',
			},
		];
		const updatedChannel = {
			id: 1,
			v1: 'test',
		};

		const newState = reducer(initialState, {
			type: actions.UPDATE_CHANNEL,
			value: updatedChannel,
		});

		expect(newState.core.channels).toEqual([updatedChannel]);
	});

	test('UPDATE_CHANNEL action does nothing if channel not found in state', () => {
		const initialState = _.cloneDeep(defaultState);
		initialState.core.channels = [
			{
				id: 1,
				foo: 'bar',
			},
		];
		const updatedChannel = {
			id: 2,
			v1: 'test',
		};

		const newState = reducer(initialState, {
			type: actions.UPDATE_CHANNEL,
			value: updatedChannel,
		});

		expect(newState.core.channels).toEqual(initialState.core.channels);
	});

	test('ADD_CHANNEL action adds channel and trims non-parent channels', () => {
		const initialState = _.cloneDeep(defaultState);
		initialState.core.channels = [
			{
				id: 1,
				name: 'a',
			},
			{
				id: 2,
				name: 'b',
			},
		];
		const newChannel = {
			id: 3,
			name: 'c',
			data: {
				parentChannel: 1,
			},
		};

		const newState = reducer(initialState, {
			type: actions.ADD_CHANNEL,
			value: newChannel,
		});

		expect(newState.core.channels).toEqual([
			{
				id: 1,
				name: 'a',
			},
			newChannel,
		]);
	});

	test('REMOVE_CHANNEL action removes the specified channel', () => {
		const initialState = _.cloneDeep(defaultState);
		initialState.core.channels = [
			{
				id: 1,
			},
			{
				id: 2,
			},
		];

		const newState = reducer(initialState, {
			type: actions.REMOVE_CHANNEL,
			value: {
				id: 1,
			},
		});

		expect(newState.core.channels).toEqual([
			{
				id: 2,
			},
		]);
	});

	test('SET_CARD action merges the specified card', () => {
		const initialState = _.cloneDeep(defaultState);
		initialState.core.cards = {
			user: {
				1: {
					id: 1,
					type: 'user',
					name: 'test',
					links: {
						'is member of': [
							{
								slug: 'org-balena',
							},
						],
					},
				},
				2: {
					id: 2,
					type: 'user',
				},
			},
		};

		const newState = reducer(initialState, {
			type: actions.SET_CARD,
			value: {
				id: 1,
				type: 'user',
				foo: 'bar',
				links: {
					'has attached element': [
						{
							slug: 'some-card',
						},
					],
				},
			},
		});

		expect(newState.core.cards).toEqual({
			user: {
				1: {
					id: 1,
					type: 'user',
					name: 'test',
					foo: 'bar',
					links: {
						'is member of': [
							{
								slug: 'org-balena',
							},
						],
						'has attached element': [
							{
								slug: 'some-card',
							},
						],
					},
				},
				2: {
					id: 2,
					type: 'user',
				},
			},
		});
	});

	test('SET_USER action sets the authToken to null if not already set', () => {
		const initialState = _.cloneDeep(defaultState);

		expect(initialState.core.session).toBeNull();

		const newState = reducer(initialState, {
			type: actions.SET_USER,
			value: 1,
		});

		expect(newState.core.session).toEqual({
			authToken: null,
			user: 1,
		});
	});

	test('SET_TIMELINE_MESSAGE action sets the message of the specified timeline', () => {
		const initialState = _.cloneDeep(defaultState);

		const newState = reducer(initialState, {
			type: actions.SET_TIMELINE_MESSAGE,
			value: {
				target: 2,
				message: 'test',
			},
		});

		expect(newState.ui.timelines).toEqual({
			2: {
				message: 'test',
			},
		});
	});

	test('SET_LENS_STATE action merges the specified lens state', () => {
		const initialState = _.cloneDeep(defaultState);
		const lens = 1;
		const cardId = 2;
		initialState.ui.lensState = {
			[lens]: {
				[cardId]: {
					var1: 'value1',
					var2: 'value2',
				},
			},
		};
		const newState = reducer(initialState, {
			type: actions.SET_LENS_STATE,
			value: {
				lens,
				cardId,
				state: {
					var1: 'value1New',
					var3: 'value3',
				},
			},
		});

		expect(newState.ui.lensState).toEqual({
			[lens]: {
				[cardId]: {
					var1: 'value1New',
					var2: 'value2',
					var3: 'value3',
				},
			},
		});
	});

	test('USER_STARTED_TYPING action adds the user to the usersTyping for that card', () => {
		const initialState = _.cloneDeep(defaultState);
		const newState = reducer(initialState, {
			type: actions.USER_STARTED_TYPING,
			value: {
				card: 2,
				user: 'test',
			},
		});

		expect(newState.core.usersTyping).toEqual({
			2: {
				test: true,
			},
		});
	});

	test('USER_STOPPED_TYPING action removes the user from the usersTyping for that card', () => {
		const initialState = _.cloneDeep(defaultState);
		initialState.core.usersTyping = {
			2: {
				test1: true,
				test2: true,
			},
		};
		const newState = reducer(initialState, {
			type: actions.USER_STOPPED_TYPING,
			value: {
				card: 2,
				user: 'test1',
			},
		});

		expect(newState.core.usersTyping).toEqual({
			2: {
				test2: true,
			},
		});
	});

	test('SET_GROUPS identifies groups that the given user is part of', () => {
		const userSlug = 'user-1';
		const groups = [
			{
				name: 'group1',
				links: {
					'has group member': [
						{
							slug: userSlug,
						},
					],
				},
			},
			{
				name: 'group2',
				links: {
					'has group member': [
						{
							slug: 'another-user',
						},
					],
				},
			},
		];
		const initialState = _.cloneDeep(defaultState);
		const newState = reducer(initialState, {
			type: actions.SET_GROUPS,
			value: {
				groups,
				userSlug,
			},
		});
		expect(newState.core.groups).toEqual({
			group1: {
				name: 'group1',
				users: [userSlug],
				isMine: true,
			},
			group2: {
				name: 'group2',
				users: ['another-user'],
				isMine: false,
			},
		});
	});
});

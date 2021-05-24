/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import sinon from 'sinon';
import _ from 'lodash';
import Bluebird from 'bluebird';
import { v4 as uuid } from 'uuid';
import { v4 as isUUID } from 'is-uuid';
import actions from '../actions';
import { actionCreators } from './';

const sandbox = sinon.createSandbox();

const context: any = {};

const cardId = uuid();
const cardSlug = 'user-a';

const card = {
	id: cardId,
	name: 'Test User',
	slug: cardSlug,
	type: 'user',
	version: '1.0.0',
	data: {
		email: 'test@balena.io',
		avatar: 'https://images.com/1.jpg',
	},
	links: {
		'is member of': [
			{
				slug: 'org-balena',
			},
		],
	},
};

const getStateFactory = (userCard?) => () => ({
	core: {
		cards: {
			user: userCard
				? {
						[userCard.id]: userCard,
				  }
				: {},
		},
	},
});

const testGetCardWithCache = async (idOrSlug: string) => {
	const { getCardAction, sdk, dispatch, thunkContext } = context;

	const fetchedCard = await getCardAction(idOrSlug)(
		dispatch,
		getStateFactory(card),
		thunkContext,
	);

	// Verify expected card was returned
	expect(fetchedCard).toEqual(card);

	// But the SDK query was not called
	expect(sdk.query.notCalled).toBe(true);
};

const testGetCardWithMissingLink = async (idOrSlug: string) => {
	const { getCardAction, sdk, dispatch, thunkContext } = context;
	sdk.query = sandbox.fake.resolves([card]);

	// The cached card does not have any links included
	const cachedCard = _.omit(card, 'links');

	const fetchedCard = await getCardAction(idOrSlug)(
		dispatch,
		getStateFactory(cachedCard),
		thunkContext,
	);

	// Verify expected card was returned
	expect(fetchedCard).toEqual(card);

	// And the SDK query was called
	expect(sdk.query.calledOnce).toBe(true);
};

const testGetCardUsingAPI = async (idOrSlug: string) => {
	const { getCardAction, sdk, dispatch, thunkContext } = context;
	sdk.query = sandbox.fake.resolves([card]);

	const fetchedCard = await getCardAction(idOrSlug)(
		dispatch,
		getStateFactory(),
		thunkContext,
	);

	// Verify expected card was returned
	expect(fetchedCard).toEqual(card);

	// And that the SDK query method was called as expected
	expect(sdk.query.calledOnce).toBe(true);
	const query = sdk.query.getCall(0).args[0];

	expect(query).toEqual({
		type: 'object',
		properties: {
			[isUUID(idOrSlug) ? 'id' : 'slug']: {
				const: idOrSlug,
			},
		},
		additionalProperties: true,
		$$links: {
			'is member of': {
				type: 'object',
				additionalProperties: true,
			},
		},
	});

	// Finally check that the correct action was dispatched
	expect(dispatch.calledOnce).toBe(true);
	expect(dispatch.getCall(0).args[0]).toEqual({
		type: actions.SET_CARD,
		value: card,
	});
};

const testGetCardDebounce = async (idOrSlug: string) => {
	const { getCardAction, sdk, dispatch, thunkContext } = context;
	const getState = getStateFactory();
	let q1Resolver: any = null;
	const q1Promise = new Promise((resolve) => {
		q1Resolver = resolve;
	});

	sdk.query = sandbox.stub();
	sdk.query.onCall(0).returns(q1Promise);
	sdk.query.onCall(1).returns(new Promise(_.noop));

	// Kick off two requests for the same card
	const cardPromise1 = getCardAction(idOrSlug)(
		dispatch,
		getState,
		thunkContext,
	);
	const cardPromise2 = getCardAction(idOrSlug)(
		dispatch,
		getState,
		thunkContext,
	);

	// The first request is handled
	q1Resolver([card]);

	// Wait for both actions to return
	const cards = await Bluebird.all([cardPromise1, cardPromise2]);

	// Verify expected card was returned each time
	expect(cards[0]).toEqual(card);
	expect(cards[1]).toEqual(card);

	// And that the SDK query method was only called once
	// Both calls ended up awaiting the same response
	expect(sdk.query.calledOnce).toBe(true);
};

describe('Redux action creators', () => {
	beforeEach(() => {
		context.dispatch = sandbox.fake();
		context.sdk = {
			query: sandbox.fake(),
			card: {
				get: sandbox.fake(),
				update: sandbox.fake(),
			},
		};

		const analytics = {
			track: sandbox.fake(),
			identify: sandbox.fake(),
		};

		const errorReporter = {
			reportException: sandbox.fake(),
			setUser: sandbox.fake(),
		};

		context.thunkContext = {
			analytics,
			errorReporter,
			sdk: context.sdk,
		};

		context.getCardAction = (idOrSlug: string) =>
			actionCreators.getCard(idOrSlug, 'user', ['is member of']);
		context.getActorAction = actionCreators.getActor(cardId);
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('getCard', () => {
		test('returns the cached card if found', async () => {
			await testGetCardWithCache(cardId);
		});

		test('returns the cached card if found - using slug', async () => {
			await testGetCardWithCache(cardSlug);
		});

		test('does not use cache if a requested link is missing', async () => {
			await testGetCardWithMissingLink(cardId);
		});

		test('does not use cache if a requested link is missing - using slug', async () => {
			await testGetCardWithMissingLink(cardId);
		});

		test('uses the API to fetch the card if not already cached', async () => {
			await testGetCardUsingAPI(cardId);
		});

		test('uses the API to fetch the card if not already cached - using slug', async () => {
			await testGetCardUsingAPI(cardSlug);
		});

		test('debounces calls to fetch the same card', async () => {
			await testGetCardDebounce(cardId);
		});

		test('debounces calls to fetch the same card - using slug', async () => {
			await testGetCardDebounce(cardSlug);
		});
	});

	describe('getActor', () => {
		test('returns an actor using the cached user card if found', async () => {
			const { getActorAction, sdk, dispatch, thunkContext } = context;

			const actor = await getActorAction(
				dispatch,
				getStateFactory(card),
				thunkContext,
			);

			// Verify the structure of the returned actor
			expect(actor).toEqual({
				name: 'Test User',
				email: 'test@balena.io',
				avatarUrl: 'https://images.com/1.jpg',
				proxy: false,
				card,
			});

			// But the SDK query was not called
			expect(sdk.query.notCalled).toBe(true);
		});
	});

	describe('setViewStarred', () => {
		test("setViewStarred(_, true) adds the view slug to the list of starred views in the user's profile", async () => {
			const { sdk, dispatch, thunkContext } = context;

			const getState = () => ({
				core: {
					session: {
						user: {
							id: '1',
							data: {
								profile: {
									starredViews: [],
								},
							},
						},
					},
				},
			});

			const view = {
				slug: 'my-view',
			};

			sdk.getById = sandbox.fake.resolves({
				id: '1',
				data: {
					profile: {
						starredViews: [view.slug],
					},
				},
			});

			await actionCreators.setViewStarred(view, true)(
				dispatch,
				getState,
				thunkContext,
			);

			// 1: setUser
			expect(dispatch.calledOnce).toBe(true);

			// The user's card is updated via the SDK
			expect(sdk.card.update.calledOnce).toBe(true);
			expect(sdk.card.update.getCall(0).args).toEqual([
				'1',
				'user',
				[
					{
						op: 'add',
						path: '/data/profile/starredViews/0',
						value: 'my-view',
					},
				],
			]);

			// Then the user is fetched via the SDK
			expect(sdk.getById.calledOnce).toBe(true);
			expect(sdk.getById.getCall(0).args[0]).toBe('1');

			// And the user is updated in the store
			expect(dispatch.getCall(0).args).toEqual([
				{
					type: actions.SET_USER,
					value: {
						id: '1',
						data: {
							profile: {
								starredViews: [view.slug],
							},
						},
					},
				},
			]);
		});

		test("setViewStarred(_, false) removes the view slug to the list of starred views in the user's profile", async () => {
			const { sdk, dispatch, thunkContext } = context;

			const view = {
				slug: 'my-view',
			};

			const getState = () => ({
				core: {
					session: {
						user: {
							id: '1',
							data: {
								profile: {
									starredViews: [view.slug],
								},
							},
						},
					},
				},
			});

			sdk.getById = sandbox.fake.resolves({
				id: '1',
				data: {
					profile: {
						starredViews: [],
					},
				},
			});

			await actionCreators.setViewStarred(view, false)(
				dispatch,
				getState,
				thunkContext,
			);

			// 1: setUser
			expect(dispatch.calledOnce).toBe(true);

			// The user's card is updated via the SDK
			expect(sdk.card.update.calledOnce).toBe(true);
			expect(sdk.card.update.getCall(0).args).toEqual([
				'1',
				'user',
				[
					{
						op: 'remove',
						path: '/data/profile/starredViews/0',
					},
				],
			]);

			// Then the user is fetched via the SDK
			expect(sdk.getById.calledOnce).toBe(true);
			expect(sdk.getById.getCall(0).args[0]).toBe('1');

			// And the user is updated in the store
			expect(dispatch.getCall(0).args).toEqual([
				{
					type: actions.SET_USER,
					value: {
						id: '1',
						data: {
							profile: {
								starredViews: [],
							},
						},
					},
				},
			]);
		});
	});

	describe('setDefault', () => {
		test("sets the homeView field in the user's profile", async () => {
			const { sdk, dispatch, thunkContext } = context;

			const getState = () => ({
				core: {
					session: {
						user: {
							id: '1',
							data: {
								profile: {},
							},
						},
					},
				},
			});

			const view = {
				id: 'view-123',
			};

			sdk.getById = sandbox.fake.resolves({
				id: '1',
				data: {
					profile: {
						homeView: view.id,
					},
				},
			});

			await actionCreators.setDefault(view)(dispatch, getState, thunkContext);

			// 1: setUser
			expect(dispatch.calledOnce).toBe(true);

			// The user's card is updated via the SDK
			expect(sdk.card.update.calledOnce).toBe(true);
			expect(sdk.card.update.getCall(0).args).toEqual([
				'1',
				'user',
				[
					{
						op: 'add',
						path: '/data/profile/homeView',
						value: view.id,
					},
				],
			]);

			// Then the user is fetched via the SDK
			expect(sdk.getById.calledOnce).toBe(true);
			expect(sdk.getById.getCall(0).args[0]).toBe('1');

			// And the user is updated in the store
			expect(dispatch.getCall(0).args).toEqual([
				{
					type: actions.SET_USER,
					value: {
						id: '1',
						data: {
							profile: {
								homeView: view.id,
							},
						},
					},
				},
			]);
		});
	});

	describe('createChannelQuery', () => {
		test('handles IDs', () => {
			const query = actionCreators.createChannelQuery(cardId);
			expect(query.properties.id.const).toBe(cardId);
		});

		test('handles plain slugs', () => {
			const query = actionCreators.createChannelQuery(cardSlug);
			expect(query.properties.slug.const).toBe(cardSlug);
			expect(query.properties.version.const).toBe('1.0.0');
		});

		test('handles versioned slugs', () => {
			const query = actionCreators.createChannelQuery(`${cardSlug}@2.4.5`);
			expect(query.properties.slug.const).toBe(cardSlug);
			expect(query.properties.version.const).toBe('2.4.5');
		});
	});
});

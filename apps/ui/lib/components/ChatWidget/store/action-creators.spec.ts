import sinon from 'sinon';
import { SET_CARDS } from './action-types';
import noop from 'lodash/noop';
import omit from 'lodash/omit';
import { getActor, getCard } from './action-creators';

const sandbox = sinon.createSandbox();

const cardId = '1';

const card = {
	id: cardId,
	name: 'Test User',
	slug: 'user-a',
	type: 'user',
	version: '1.0.0',
	data: {
		email: 'test@balena.io',
		avatar: 'https://images.com/1.jpg',
		profile: {
			name: {
				first: 'Test',
				last: 'User',
			},
		},
	},
	links: {
		'is member of': [
			{
				slug: 'org-balena',
			},
		],
	},
};

const context: any = {};

beforeEach(() => {
	context.ctx = {
		store: {
			dispatch: sandbox.fake(),
			getState: sandbox.stub(),
		},
		sdk: {
			query: sandbox.fake(),
			card: {
				get: sandbox.fake(),
			},
		},
	};
	context.getCardAction = getCard(context.ctx);
	context.getActorAction = getActor(context.ctx);
});

afterEach(() => {
	sandbox.restore();
});

test('getCard returns the cached card if found', async () => {
	const { getCardAction, ctx } = context;

	ctx.store.getState.onCall(0).returns({
		cards: {
			[card.id]: card,
		},
	});
	const fetchedCard = await getCardAction(cardId, 'user', ['is member of']);

	// Verify expected card was returned
	expect(fetchedCard).toEqual(card);

	// But the SDK query was not called
	expect(ctx.sdk.query.notCalled).toBe(true);
});

test('getCard does not use cache if a requested link is missing', async () => {
	const { getCardAction, ctx } = context;
	ctx.sdk.query = sandbox.fake.resolves([card]);

	// The cached card does not have any links included
	ctx.store.getState.onCall(0).returns({
		cards: {
			[card.id]: omit(card, 'links'),
		},
	});
	const fetchedCard = await getCardAction(cardId, 'user', ['is member of']);

	// Verify expected card was returned
	expect(fetchedCard).toEqual(card);

	// And the SDK query was called
	expect(ctx.sdk.query.calledOnce).toBe(true);
});

test('getCard uses the API to fetch the card if not already cached', async () => {
	const { getCardAction, ctx } = context;
	ctx.sdk.query = sandbox.fake.resolves([card]);
	ctx.store.getState.onCall(0).returns({
		cards: {},
	});
	const fetchedCard = await getCardAction(cardId, 'user', ['is member of']);

	// Verify expected card was returned
	expect(fetchedCard).toEqual(card);

	// And that the SDK query method was called as expected
	expect(ctx.sdk.query.calledOnce).toBe(true);
	const query = ctx.sdk.query.getCall(0).args[0];
	expect(query).toEqual({
		type: 'object',
		properties: {
			id: {
				const: cardId,
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
	expect(ctx.store.dispatch.calledOnce).toBe(true);
	expect(ctx.store.dispatch.getCall(0).args[0]).toEqual({
		type: SET_CARDS,
		payload: [card],
	});
});

test('getCard debounces calls to fetch the same card ID', async () => {
	const { getCardAction, ctx } = context;
	let q1Resolver: any = null;
	const q1Promise = new Promise((resolve) => {
		q1Resolver = resolve;
	});

	ctx.sdk.query = sandbox.stub();
	ctx.sdk.query.onCall(0).returns(q1Promise);
	ctx.sdk.query.onCall(1).returns(new Promise(noop));

	ctx.store.getState.returns({
		cards: {},
	});

	// Kick off two requests for the same card
	const cardPromise1 = getCardAction(cardId, 'user', ['is member of']);
	const cardPromise2 = getCardAction(cardId, 'user', ['is member of']);

	// The first request is handled
	q1Resolver([card]);

	// Wait for both actions to return
	const [card1, card2] = await Promise.all([cardPromise1, cardPromise2]);

	// Verify expected card was returned each time
	expect(card1).toEqual(card);
	expect(card2).toEqual(card);

	// And that the SDK query method was only called once
	// Both calls ended up awaiting the same response
	expect(ctx.sdk.query.calledOnce).toBe(true);
});

test('getActor returns an actor using the cached user card if found', async () => {
	const { getActorAction, ctx } = context;

	ctx.store.getState.returns({
		cards: {
			[card.id]: card,
		},
	});

	const actor = await getActorAction(cardId);

	// Verify the structure of the returned actor
	expect(actor).toEqual({
		name: 'Test User',
		email: 'test@balena.io',
		avatarUrl: 'https://images.com/1.jpg',
		proxy: true,
		card,
	});

	// But the SDK query was not called
	expect(ctx.sdk.query.notCalled).toBe(true);
});

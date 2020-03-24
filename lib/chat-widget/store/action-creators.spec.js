/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import _ from 'lodash'
import Bluebird from 'bluebird'
import {
	SET_CARDS
} from './action-types'
import {
	getActor,
	getCard
} from './action-creators'

const sandbox = sinon.createSandbox()

const cardId = '1'

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
				last: 'User'
			}
		}
	},
	links: {
		'is member of': [
			{
				slug: 'org-balena'
			}
		]
	}
}

ava.beforeEach((test) => {
	test.context.ctx = {
		store: {
			dispatch: sandbox.fake(),
			getState: sandbox.stub()
		},
		sdk: {
			query: sandbox.fake(),
			card: {
				get: sandbox.fake()
			}
		}
	}
	test.context.getCardAction = getCard(test.context.ctx)
	test.context.getActorAction = getActor(test.context.ctx)
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('getCard returns the cached card if found', async (test) => {
	const {
		getCardAction,
		ctx
	} = test.context

	ctx.store.getState.onCall(0).returns({
		cards: {
			[card.id]: card
		}
	})
	const fetchedCard = await getCardAction(cardId, 'user', [ 'is member of' ])

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// But the SDK query was not called
	test.true(ctx.sdk.query.notCalled)
})

ava('getCard does not use cache if a requested link is missing', async (test) => {
	const {
		getCardAction,
		ctx
	} = test.context
	ctx.sdk.query = sandbox.fake.resolves([ card ])

	// The cached card does not have any links included
	ctx.store.getState.onCall(0).returns({
		cards: {
			[card.id]: _.omit(card, 'links')
		}
	})
	const fetchedCard = await getCardAction(cardId, 'user', [ 'is member of' ])

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// And the SDK query was called
	test.true(ctx.sdk.query.calledOnce)
})

ava('getCard uses the API to fetch the card if not already cached', async (test) => {
	const {
		getCardAction,
		ctx
	} = test.context
	ctx.sdk.query = sandbox.fake.resolves([ card ])
	ctx.store.getState.onCall(0).returns({
		cards: {}
	})
	const fetchedCard = await getCardAction(cardId, 'user', [ 'is member of' ])

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// And that the SDK query method was called as expected
	test.true(ctx.sdk.query.calledOnce)
	const query = ctx.sdk.query.getCall(0).args[0]
	test.deepEqual(query, {
		type: 'object',
		properties: {
			id: {
				const: cardId
			}
		},
		additionalProperties: true,
		$$links: {
			'is member of': {
				type: 'object',
				additionalProperties: true
			}
		}
	})

	// Finally check that the correct action was dispatched
	test.true(ctx.store.dispatch.calledOnce)
	test.deepEqual(ctx.store.dispatch.getCall(0).args[0], {
		type: SET_CARDS,
		payload: [ card ]
	})
})

ava('getCard debounces calls to fetch the same card ID', async (test) => {
	const {
		getCardAction,
		ctx
	} = test.context
	let q1Resolver = null
	const q1Promise = new Promise((resolve) => {
		q1Resolver = resolve
	})

	ctx.sdk.query = sandbox.stub()
	ctx.sdk.query.onCall(0).returns(q1Promise)
	ctx.sdk.query.onCall(1).returns(new Promise(_.noop))

	ctx.store.getState.returns({
		cards: {}
	})

	// Kick off two requests for the same card
	const cardPromise1 = getCardAction(cardId, 'user', [ 'is member of' ])
	const cardPromise2 = getCardAction(cardId, 'user', [ 'is member of' ])

	// The first request is handled
	q1Resolver([ card ])

	// Wait for both actions to return
	const cards = await Bluebird.all([ cardPromise1, cardPromise2 ])

	// Verify expected card was returned each time
	test.deepEqual(cards[0], card)
	test.deepEqual(cards[1], card)

	// And that the SDK query method was only called once
	// Both calls ended up awaiting the same response
	test.true(ctx.sdk.query.calledOnce)
})

ava('getActor returns an actor using the cached user card if found', async (test) => {
	const {
		getActorAction,
		ctx
	} = test.context

	ctx.store.getState.returns({
		cards: {
			[card.id]: card
		}
	})

	const actor = await getActorAction(cardId)

	// Verify the structure of the returned actor
	test.deepEqual(actor, {
		name: 'Test User',
		email: 'test@balena.io',
		avatarUrl: 'https://images.com/1.jpg',
		proxy: true,
		card
	})

	// But the SDK query was not called
	test.true(ctx.sdk.query.notCalled)
})

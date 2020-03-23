/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import _ from 'lodash'
import Bluebird from 'bluebird'

// HACK: We need to import this first to avoid a cyclical dependency issue
import {
	// eslint-disable-next-line no-unused-vars
	store
} from '../index'
import actions from './actions'
import ActionCreator from './actioncreators'

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
		avatar: 'https://images.com/1.jpg'
	},
	links: {
		'is member of': [
			{
				slug: 'org-balena'
			}
		]
	}
}

const getStateFactory = (userCard) => () => ({
	core: {
		cards: {
			user: userCard ? {
				[userCard.id]: userCard
			} : {}
		}
	}
})

ava.beforeEach((test) => {
	test.context.dispatch = sandbox.fake()
	test.context.sdk = {
		query: sandbox.fake(),
		card: {
			get: sandbox.fake()
		}
	}
	test.context.analytics = {
		track: sandbox.fake(),
		identify: sandbox.fake()
	}
	test.context.actionCreator = new ActionCreator({
		sdk: test.context.sdk,
		analytics: test.context.analytics
	})
	test.context.getCardAction = test.context.actionCreator.getCard(cardId, 'user', [ 'is member of' ])
	test.context.getActorAction = test.context.actionCreator.getActor(cardId)
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('getCard returns the cached card if found', async (test) => {
	const {
		getCardAction,
		sdk,
		dispatch
	} = test.context

	const fetchedCard = await getCardAction(dispatch, getStateFactory(card))

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// But the SDK query was not called
	test.is(sdk.query.callCount, 0)
})

ava('getCard uses the API to fetch the card if not already cached', async (test) => {
	const {
		getCardAction,
		sdk,
		dispatch
	} = test.context
	sdk.query = sandbox.fake.resolves([ card ])

	const fetchedCard = await getCardAction(dispatch, getStateFactory())

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// And that the SDK query method was called as expected
	test.is(sdk.query.callCount, 1)
	const query = sdk.query.getCall(0).args[0]
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
	test.is(dispatch.callCount, 1)
	test.deepEqual(dispatch.getCall(0).args[0], {
		type: actions.SET_CARD,
		value: card
	})
})

ava('getCard debounces calls to fetch the same card ID', async (test) => {
	const {
		getCardAction,
		sdk,
		dispatch
	} = test.context
	const getState = getStateFactory()
	let q1Resolver = null
	const q1Promise = new Promise((resolve) => {
		q1Resolver = resolve
	})

	sdk.query = sandbox.stub()
	sdk.query.onCall(0).returns(q1Promise)
	sdk.query.onCall(1).returns(new Promise(_.noop))

	// Kick off two requests for the same card
	const cardPromise1 = getCardAction(dispatch, getState)
	const cardPromise2 = getCardAction(dispatch, getState)

	// The first request is handled
	q1Resolver([ card ])

	// Wait for both actions to return
	const cards = await Bluebird.all([ cardPromise1, cardPromise2 ])

	// Verify expected card was returned each time
	test.deepEqual(cards[0], card)
	test.deepEqual(cards[1], card)

	// And that the SDK query method was only called once
	// Both calls ended up awaiting the same response
	test.is(sdk.query.callCount, 1)
})

ava('getActor returns an actor using the cached user card if found', async (test) => {
	const {
		getActorAction,
		sdk,
		dispatch
	} = test.context

	const actor = await getActorAction(dispatch, getStateFactory(card))

	// Verify the structure of the returned actor
	test.deepEqual(actor, {
		name: 'Test User',
		email: 'test@balena.io',
		avatarUrl: 'https://images.com/1.jpg',
		proxy: false,
		card
	})

	// But the SDK query was not called
	test.is(sdk.query.callCount, 0)
})

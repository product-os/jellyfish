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
	v4 as uuid
} from 'uuid'
import {
	v4 as isUUID
} from 'is-uuid'
import actions from '../actions'
import {
	actionCreators
} from './'

const sandbox = sinon.createSandbox()

const cardId = uuid()
const cardSlug = 'user-a'

const card = {
	id: cardId,
	name: 'Test User',
	slug: cardSlug,
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

const testGetCardWithCache = async (test, idOrSlug) => {
	const {
		getCardAction,
		sdk,
		dispatch,
		thunkContext
	} = test.context

	const fetchedCard = await getCardAction(idOrSlug)(dispatch, getStateFactory(card), thunkContext)

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// But the SDK query was not called
	test.true(sdk.query.notCalled)
}

const testGetCardWithMissingLink = async (test, idOrSlug) => {
	const {
		getCardAction,
		sdk,
		dispatch,
		thunkContext
	} = test.context
	sdk.query = sandbox.fake.resolves([ card ])

	// The cached card does not have any links included
	const cachedCard = _.omit(card, 'links')

	const fetchedCard = await getCardAction(idOrSlug)(dispatch, getStateFactory(cachedCard), thunkContext)

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// And the SDK query was called
	test.true(sdk.query.calledOnce)
}

const testGetCardUsingAPI = async (test, idOrSlug) => {
	const {
		getCardAction,
		sdk,
		dispatch,
		thunkContext
	} = test.context
	sdk.query = sandbox.fake.resolves([ card ])

	const fetchedCard = await getCardAction(idOrSlug)(dispatch, getStateFactory(), thunkContext)

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// And that the SDK query method was called as expected
	test.true(sdk.query.calledOnce)
	const query = sdk.query.getCall(0).args[0]

	test.deepEqual(query, {
		type: 'object',
		properties: {
			[isUUID(idOrSlug) ? 'id' : 'slug']: {
				const: idOrSlug
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
	test.true(dispatch.calledOnce)
	test.deepEqual(dispatch.getCall(0).args[0], {
		type: actions.SET_CARD,
		value: card
	})
}

const testGetCardDebounce = async (test, idOrSlug) => {
	const {
		getCardAction,
		sdk,
		dispatch,
		thunkContext
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
	const cardPromise1 = getCardAction(idOrSlug)(dispatch, getState, thunkContext)
	const cardPromise2 = getCardAction(idOrSlug)(dispatch, getState, thunkContext)

	// The first request is handled
	q1Resolver([ card ])

	// Wait for both actions to return
	const cards = await Bluebird.all([ cardPromise1, cardPromise2 ])

	// Verify expected card was returned each time
	test.deepEqual(cards[0], card)
	test.deepEqual(cards[1], card)

	// And that the SDK query method was only called once
	// Both calls ended up awaiting the same response
	test.true(sdk.query.calledOnce)
}

ava.beforeEach((test) => {
	test.context.dispatch = sandbox.fake()
	test.context.sdk = {
		query: sandbox.fake(),
		card: {
			get: sandbox.fake(),
			update: sandbox.fake()
		}
	}

	const analytics = {
		track: sandbox.fake(),
		identify: sandbox.fake()
	}

	const errorReporter = {
		reportException: sandbox.fake(),
		setUser: sandbox.fake()
	}

	test.context.thunkContext = {
		analytics,
		errorReporter,
		sdk: test.context.sdk
	}

	test.context.getCardAction = (idOrSlug) => actionCreators.getCard(idOrSlug, 'user', [ 'is member of' ])
	test.context.getActorAction = actionCreators.getActor(cardId)
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('getCard returns the cached card if found', async (test) => {
	await testGetCardWithCache(test, cardId)
})

ava('getCard returns the cached card if found - using slug', async (test) => {
	await testGetCardWithCache(test, cardSlug)
})

ava('getCard does not use cache if a requested link is missing', async (test) => {
	await testGetCardWithMissingLink(test, cardId)
})

ava('getCard does not use cache if a requested link is missing - using slug', async (test) => {
	await testGetCardWithMissingLink(test, cardId)
})

ava('getCard uses the API to fetch the card if not already cached', async (test) => {
	await testGetCardUsingAPI(test, cardId)
})

ava('getCard uses the API to fetch the card if not already cached - using slug', async (test) => {
	await testGetCardUsingAPI(test, cardSlug)
})

ava('getCard debounces calls to fetch the same card', async (test) => {
	await testGetCardDebounce(test, cardId)
})

ava('getCard debounces calls to fetch the same card - using slug', async (test) => {
	await testGetCardDebounce(test, cardSlug)
})

ava('getActor returns an actor using the cached user card if found', async (test) => {
	const {
		getActorAction,
		sdk,
		dispatch,
		thunkContext
	} = test.context

	const actor = await getActorAction(dispatch, getStateFactory(card), thunkContext)

	// Verify the structure of the returned actor
	test.deepEqual(actor, {
		name: 'Test User',
		email: 'test@balena.io',
		avatarUrl: 'https://images.com/1.jpg',
		proxy: false,
		card
	})

	// But the SDK query was not called
	test.true(sdk.query.notCalled)
})

ava('setViewStarred(_, true) adds the view slug to the list of starred views in the user\'s profile', async (test) => {
	const {
		sdk,
		dispatch,
		thunkContext
	} = test.context

	const getState = () => ({
		core: {
			session: {
				user: {
					id: '1',
					data: {
						profile: {
							starredViews: []
						}
					}
				}
			}
		}
	})

	const view = {
		slug: 'my-view'
	}

	sdk.getById = sandbox.fake.resolves({
		id: '1',
		data: {
			profile: {
				starredViews: [ view.slug ]
			}
		}
	})

	await actionCreators.setViewStarred(view, true)(dispatch, getState, thunkContext)

	// 1: setUser
	test.true(dispatch.calledOnce)

	// The user's card is updated via the SDK
	test.true(sdk.card.update.calledOnce)
	test.deepEqual(
		sdk.card.update.getCall(0).args,
		[
			'1',
			'user',
			[
				{
					op: 'add',
					path: '/data/profile/starredViews/0',
					value: 'my-view'
				}
			]
		]
	)

	// Then the user is fetched via the SDK
	test.true(sdk.getById.calledOnce)
	test.is(sdk.getById.getCall(0).args[0], '1')

	// And the user is updated in the store
	test.deepEqual(
		dispatch.getCall(0).args,
		[ {
			type: actions.SET_USER,
			value: {
				id: '1',
				data: {
					profile: {
						starredViews: [ view.slug ]
					}
				}
			}
		} ]
	)
})

ava('setViewStarred(_, false) removes the view slug to the list of starred views in the user\'s profile', async (test) => {
	const {
		sdk,
		dispatch,
		thunkContext
	} = test.context

	const view = {
		slug: 'my-view'
	}

	const getState = () => ({
		core: {
			session: {
				user: {
					id: '1',
					data: {
						profile: {
							starredViews: [ view.slug ]
						}
					}
				}
			}
		}
	})

	sdk.getById = sandbox.fake.resolves({
		id: '1',
		data: {
			profile: {
				starredViews: []
			}
		}
	})

	await actionCreators.setViewStarred(view, false)(dispatch, getState, thunkContext)

	// 1: setUser
	test.true(dispatch.calledOnce)

	// The user's card is updated via the SDK
	test.true(sdk.card.update.calledOnce)
	test.deepEqual(
		sdk.card.update.getCall(0).args,
		[
			'1',
			'user',
			[
				{
					op: 'remove',
					path: '/data/profile/starredViews/0'
				}
			]
		]
	)

	// Then the user is fetched via the SDK
	test.true(sdk.getById.calledOnce)
	test.is(sdk.getById.getCall(0).args[0], '1')

	// And the user is updated in the store
	test.deepEqual(
		dispatch.getCall(0).args,
		[ {
			type: actions.SET_USER,
			value: {
				id: '1',
				data: {
					profile: {
						starredViews: []
					}
				}
			}
		} ]
	)
})

ava('setDefault() sets the homeView field in the user\'s profile', async (test) => {
	const {
		sdk,
		dispatch,
		thunkContext
	} = test.context

	const getState = () => ({
		core: {
			session: {
				user: {
					id: '1',
					data: {
						profile: { }
					}
				}
			}
		}
	})

	const view = {
		id: 'view-123'
	}

	sdk.getById = sandbox.fake.resolves({
		id: '1',
		data: {
			profile: {
				homeView: view.id
			}
		}
	})

	await actionCreators.setDefault(view)(dispatch, getState, thunkContext)

	// 1: setUser
	test.true(dispatch.calledOnce)

	// The user's card is updated via the SDK
	test.true(sdk.card.update.calledOnce)
	test.deepEqual(
		sdk.card.update.getCall(0).args,
		[
			'1',
			'user',
			[
				{
					op: 'add',
					path: '/data/profile/homeView',
					value: view.id
				}
			]
		]
	)

	// Then the user is fetched via the SDK
	test.true(sdk.getById.calledOnce)
	test.is(sdk.getById.getCall(0).args[0], '1')

	// And the user is updated in the store
	test.deepEqual(
		dispatch.getCall(0).args,
		[ {
			type: actions.SET_USER,
			value: {
				id: '1',
				data: {
					profile: {
						homeView: view.id
					}
				}
			}
		} ]
	)
})

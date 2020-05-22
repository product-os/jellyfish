/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import _ from 'lodash'
import Bluebird from 'bluebird'
import actions from '../actions'
import ActionCreator, {
	mentionsUser
} from './'

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
			get: sandbox.fake(),
			update: sandbox.fake()
		}
	}
	test.context.analytics = {
		track: sandbox.fake(),
		identify: sandbox.fake()
	}
	test.context.errorReporter = {
		reportException: sandbox.fake(),
		setUser: sandbox.fake()
	}
	test.context.actionCreator = new ActionCreator({
		sdk: test.context.sdk,
		errorReporter: test.context.errorReporter,
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
	test.true(sdk.query.notCalled)
})

ava('getCard does not use cache if a requested link is missing', async (test) => {
	const {
		getCardAction,
		sdk,
		dispatch
	} = test.context
	sdk.query = sandbox.fake.resolves([ card ])

	// The cached card does not have any links included
	const cachedCard = _.omit(card, 'links')

	const fetchedCard = await getCardAction(dispatch, getStateFactory(cachedCard))

	// Verify expected card was returned
	test.deepEqual(fetchedCard, card)

	// And the SDK query was called
	test.true(sdk.query.calledOnce)
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
	test.true(sdk.query.calledOnce)
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
	test.true(dispatch.calledOnce)
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
	test.true(sdk.query.calledOnce)
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
	test.true(sdk.query.notCalled)
})

ava('setViewStarred(_, true) adds the view slug to the list of starred views in the user\'s profile', async (test) => {
	const {
		actionCreator,
		sdk,
		dispatch
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

	await actionCreator.setViewStarred(view, true)(dispatch, getState)

	// 1: setUser, 2: addNotification
	test.is(dispatch.callCount, 2)

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
		actionCreator,
		sdk,
		dispatch
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

	await actionCreator.setViewStarred(view, false)(dispatch, getState)

	// 1: setUser, 2: addNotification
	test.is(dispatch.callCount, 2)

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
		actionCreator,
		sdk,
		dispatch
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

	await actionCreator.setDefault(view)(dispatch, getState)

	// 1: setUser, 2: addNotification
	test.is(dispatch.callCount, 2)

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

ava('mentionsUser() returns true if user slug in mentionsUser field', async (test) => {
	const user = {
		slug: 'user-test'
	}

	const cardWithMentionsUser = {
		data: {
			payload: {
				mentionsUser: [ 'user-test' ]
			}
		}
	}

	const userGroups = {
		all: {
			names: [],
			groups: {}
		},
		mine: {
			names: [],
			groups: {}
		}
	}

	test.true(mentionsUser(cardWithMentionsUser, user, userGroups))
})

ava('mentionsUser() returns true if user slug in one of the user groups', async (test) => {
	const user = {
		slug: 'user-test'
	}

	const cardWithMentionsUser = {
		data: {
			payload: {
				mentionsGroup: [ 'group1' ]
			}
		}
	}

	const userGroups = {
		all: {
			names: [],
			groups: {}
		},
		mine: {
			names: [ 'group1' ],
			groups: {
				group1: {}
			}
		}
	}

	test.true(mentionsUser(cardWithMentionsUser, user, userGroups))
})

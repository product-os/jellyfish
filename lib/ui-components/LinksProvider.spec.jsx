/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import _ from 'lodash'
import {
	mount,
	configure
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import {
	LinksProvider,
	withLink,
	withLinks,
	useLink,
	useLinks
} from './LinksProvider'
import Adapter from 'enzyme-adapter-react-16'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const sandbox = sinon.createSandbox()

ava.afterEach(async (test) => {
	sandbox.restore()
})

const user1 = {
	id: 'u1',
	type: 'user@1.0.0',
	slug: 'user-1'
}

const user2 = {
	id: 'u2',
	type: 'user@1.0.0',
	slug: 'user-2'
}

const card = {
	id: 'a1',
	type: 'account@1.0.0'
}

const cardWithOwner = {
	...card,
	links: {
		'has backup owner': [ user1 ]
	}
}

const cardWithOwners = {
	...card,
	links: {
		'has backup owner': [ user1, user2 ]
	}
}

const TestSubscriberInner = () => {
	return <div>Subscriber</div>
}

ava('LinksProvider can be used with withLink', async (test) => {
	const linkPropName = 'cardOwner'
	const linkVerb = 'has backup owner'
	const TestSubscriber = withLink(linkVerb, linkPropName)(TestSubscriberInner)
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwner)
		}
	}

	const provider = await mount(
		<LinksProvider sdk={sdk} cards={[ card ]} link={linkVerb}>
			<TestSubscriber card={card} />
		</LinksProvider>
	)

	provider.update()

	test.true(sdk.card.getWithLinks.calledOnce)
	test.deepEqual(sdk.card.getWithLinks.getCall(0).args, [ card.id, linkVerb ])
	const subscriber = provider.find('TestSubscriberInner')
	test.deepEqual(subscriber.props()[linkPropName], user1)
	test.true(_.isFunction(subscriber.props().updateCardOwnerCache))
})

ava('LinksProvider can be used with withLinks', async (test) => {
	const linksPropName = 'cardOwners'
	const linkVerb = 'has backup owner'
	const TestSubscriber = withLinks(linkVerb, linksPropName)(TestSubscriberInner)
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwners)
		}
	}

	const provider = await mount(
		<LinksProvider sdk={sdk} cards={[ card ]} link={linkVerb}>
			<TestSubscriber card={card} />
		</LinksProvider>
	)

	provider.update()

	test.true(sdk.card.getWithLinks.calledOnce)
	test.deepEqual(sdk.card.getWithLinks.getCall(0).args, [ card.id, linkVerb ])
	const subscriber = provider.find('TestSubscriberInner')
	test.deepEqual(subscriber.props()[linksPropName], [ user1, user2 ])
	test.true(_.isFunction(subscriber.props().updateCardOwnersCache))
})

ava('LinksProvider can be used with useLink', async (test) => {
	const linkPropName = 'cardOwner'
	const linkVerb = 'has backup owner'
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwner)
		}
	}

	const subscriberSpy = sandbox.stub()

	const TestHooksSubscriber = () => {
		const context = useLink(linkVerb, linkPropName, card.id)
		subscriberSpy(context)
		return <div>Subscriber</div>
	}

	await mount(
		<LinksProvider sdk={sdk} cards={[ card ]} link={linkVerb}>
			<TestHooksSubscriber card={card} />
		</LinksProvider>
	)

	test.true(sdk.card.getWithLinks.calledOnce)
	test.deepEqual(sdk.card.getWithLinks.getCall(0).args, [ card.id, linkVerb ])

	const context = subscriberSpy.getCall(subscriberSpy.callCount - 1).lastArg

	test.deepEqual(context.cardOwner, user1)
	test.true(_.isFunction(context.updateCardOwnerCache))
})

ava('LinksProvider can be used with useLinks', async (test) => {
	const linksPropName = 'cardOwners'
	const linkVerb = 'has backup owner'
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwners)
		}
	}

	const subscriberSpy = sandbox.stub()

	const TestHooksSubscriber = () => {
		const context = useLinks(linkVerb, linksPropName, card.id)
		subscriberSpy(context)
		return <div>Subscriber</div>
	}

	await mount(
		<LinksProvider sdk={sdk} cards={[ card ]} link={linkVerb}>
			<TestHooksSubscriber card={card} />
		</LinksProvider>
	)

	test.true(sdk.card.getWithLinks.calledOnce)
	test.deepEqual(sdk.card.getWithLinks.getCall(0).args, [ card.id, linkVerb ])

	const context = subscriberSpy.getCall(subscriberSpy.callCount - 1).lastArg

	test.deepEqual(context.cardOwners, [ user1, user2 ])
	test.true(_.isFunction(context.updateCardOwnersCache))
})

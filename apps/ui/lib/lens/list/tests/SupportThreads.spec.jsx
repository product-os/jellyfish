/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper,
	flushPromises
} from '../../../../test/ui-setup'
import _ from 'lodash'
import subDays from 'date-fns/subDays'
import subHours from 'date-fns/subHours'
import subBusinessDays from 'date-fns/subBusinessDays'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import {
	SupportThreads
} from '../SupportThreads'
import {
	pendingEngineer,
	pendingUser
} from './fixtures'

const sandbox = sinon.createSandbox()

const now = new Date()

const wrappingComponent = getWrapper().wrapper

const getSegments = async (commonProps, thread, timestamp) => {
	const adjustedThread = _.merge({}, thread, {
		links: {
			'has attached element': {
				0: {
					data: {
						timestamp
					}
				}
			}
		}
	})
	const component = await mount((
		<SupportThreads {...commonProps} tail={[ adjustedThread ]} />
	), {
		wrappingComponent
	})

	await flushPromises()
	await flushPromises()

	return component.state().segments
}

ava.beforeEach((test) => {
	test.context.commonProps = {
		actions: {
			getActor: sandbox.stub().resolves({}),
			setLensState: sandbox.stub()
		},
		page: 0,
		pageOptions: {
			page: 0, totalPages: 1, limit: 100, sortBy: [ 'created_at' ]
		},
		channels: [],
		tail: [],
		lensState: {
			activeIndex: 2
		}
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('Pending user response threads are displayed in the pending user response tab', async (test) => {
	const {
		commonProps
	} = test.context

	// Update timestamp to be within 3 working days
	const segments = await getSegments(commonProps, pendingUser, subDays(now, 1).toISOString())

	const pendingUserResponse = _.find(segments, {
		name: 'pending user response'
	})

	test.is(pendingUserResponse.cards.length, 1)
	test.is(pendingUserResponse.cards[0].slug, pendingUser.slug)
})

ava('Pending user response threads that are more than 3 working days old ' +
'are displayed in the pending agent response tab', async (test) => {
	const {
		commonProps
	} = test.context

	// Update timestamp to be more than 3 working days old
	const segments = await getSegments(commonProps, pendingUser, subBusinessDays(now, 3).toISOString())

	const pendingAgentResponse = _.find(segments, {
		name: 'pending agent response'
	})

	test.is(pendingAgentResponse.cards.length, 1)
	test.is(pendingAgentResponse.cards[0].slug, pendingUser.slug)
})

ava('Pending engineer response threads are displayed in the pending engineer response tab', async (test) => {
	const {
		commonProps
	} = test.context

	// Update timestamp to be within 24hrs
	const segments = await getSegments(commonProps, pendingEngineer, subHours(now, 3).toISOString())

	const pendingEngineerResponse = _.find(segments, {
		name: 'pending engineer response'
	})
	test.is(pendingEngineerResponse.cards.length, 1)
	test.is(pendingEngineerResponse.cards[0].slug, pendingEngineer.slug)
})

ava('Pending engineer response threads that are more than 24 hrs old ' +
'are displayed in the pending agent response tab', async (test) => {
	const {
		commonProps
	} = test.context

	// Update timestamp to be older than 24hrs
	const segments = await getSegments(commonProps, pendingEngineer, subHours(now, 25).toISOString())

	const pendingAgentResponse = _.find(segments, {
		name: 'pending agent response'
	})
	test.is(pendingAgentResponse.cards.length, 1)
	test.is(pendingAgentResponse.cards[0].slug, pendingEngineer.slug)
})

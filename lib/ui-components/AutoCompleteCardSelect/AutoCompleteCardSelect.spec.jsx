/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	mount,
	configure
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import AutoCompleteCardSelect from './AutoCompleteCardSelect'
import Adapter from 'enzyme-adapter-react-16'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const types = [
	{
		slug: 'user',
		version: '1.0.0',
		data: {
			schema: {}
		}
	},
	{
		slug: 'issue',
		version: '1.0.0',
		data: {
			schema: {}
		}
	}
]

const users = [
	{
		id: 'u1', slug: 'user1'
	},
	{
		id: 'u2', slug: 'user2'
	}
]

const issues = [
	{
		id: 'i1', slug: 'issue1'
	},
	{
		id: 'i2', slug: 'issue2'
	}
]

const sandbox = sinon.createSandbox()

const flushPromises = () => {
	return new Promise((resolve) => {
		// eslint-disable-next-line no-undef
		return setImmediate(resolve)
	})
}

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('Results are cleared when card type changes', async (test) => {
	const onChange = sandbox.fake()
	let usersQueryResolver = null
	let issuesQueryResolver = null
	const usersQueryPromise = new Promise((resolve) => {
		usersQueryResolver = resolve
	})
	const issuesQueryPromise = new Promise((resolve) => {
		issuesQueryResolver = resolve
	})
	const query = sandbox.stub()
	query.onCall(0).returns(usersQueryPromise)
	query.onCall(1).returns(issuesQueryPromise)
	const sdk = {
		query
	}
	const autoComplete = mount(
		<AutoCompleteCardSelect
			sdk={sdk}
			cardType="user"
			types={types}
			onChange={onChange}
		/>
	)

	// Initially we've got no results but the SDK query has been called
	test.deepEqual(autoComplete.state('results'), [])
	test.is(sdk.query.callCount, 1)

	// Now we switch card types
	autoComplete.setProps({
		...autoComplete.props(),
		cardType: 'issue'
	})

	// Note that we've now called the SDK query a second time
	test.is(sdk.query.callCount, 2)

	// Before returning the initial SDK query with users
	usersQueryResolver(users)
	await flushPromises()

	// The users results should not be saved to state
	test.deepEqual(autoComplete.state('results'), [])

	// When the SDK query returns with the issues...
	issuesQueryResolver(issues)
	await flushPromises()

	// ...we should now have issues in the results state!
	test.deepEqual(autoComplete.state('results'), issues)
})

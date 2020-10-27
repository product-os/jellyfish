/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import ActionCreator from '../'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const sdk = {
		card: {
			get: sandbox.stub()
		}
	}

	const actionCreator = new ActionCreator({
		sdk,
		analytics: {
			track: sandbox.stub()
		}
	})
	actionCreator.analytics.track.resolves()

	const dispatch = (fn) => {
		return fn(dispatch)
	}

	test.context = {
		...test.context,
		actionCreator,
		sdk,
		dispatch
	}
})

ava('loadChannelData throws an error when the card does not exist', async (test) => {
	const {
		actionCreator, sdk, dispatch
	} = test.context
	sdk.card.get.resolves(null)

	const channel = {
		data: {
			target: 'view-all-users',
			canonical: true
		}
	}

	await test.throwsAsync(actionCreator.loadChannelData(channel)(dispatch), {
		instanceOf: Error,
		message: 'Couldn\'t find channel with slug: view-all-users'
	})
})

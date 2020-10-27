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

ava('constructChannelData adds the card to the head of the channel', async (test) => {
	const {
		actionCreator
	} = test.context

	const headCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstName: 'fake',
				lastName: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-message',
				type: 'message@1.0.0',
				name: 'fake message'
			} ]
		}
	}

	const channel = {
		id: 'test-channel',
		data: {
			fake: 'data'
		}
	}

	const constructedChannel = actionCreator.constructChannelData(channel, [ headCard ])
	test.deepEqual(constructedChannel, {
		...channel,
		data: {
			...channel.data,
			head: headCard
		}
	})
})

ava('constructChannelData separates out the links from the channel card and ' +
	'adds the links to the \'has linked element\' array in the channel', async (test) => {
	const {
		actionCreator
	} = test.context

	const headCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstName: 'fake',
				lastName: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-message',
				type: 'message@1.0.0',
				name: 'fake message'
			} ]
		}
	}

	const linkCard = {
		id: 'link-card',
		type: 'link@1.0.0'
	}

	const channel = {
		id: 'test-channel',
		data: {
			fake: 'data'
		}
	}

	const constructedChannel = actionCreator.constructChannelData(channel, [ headCard, linkCard ])

	const expectedResult = {
		id: 'test-channel',
		data: {
			fake: 'data',
			head: {
				id: 'fake-user',
				type: 'user@1.0.0',
				data: {
					profile: {
						firstName: 'fake',
						lastName: 'user'
					}
				},
				links: {
					'has attached element': [ {
						id: 'fake-message',
						type: 'message@1.0.0',
						name: 'fake message'
					}, linkCard ]
				}
			}
		}
	}

	test.deepEqual(constructedChannel, expectedResult)
})

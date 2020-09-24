/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	v4 as uuid
} from 'uuid'
import _ from 'lodash'
import {
	getPingQuery
} from '../../../apps/ui/core/queries'
import helpers from '../server/helpers'

ava.before(async (test) => {
	await helpers.before(test)
	const {
		sdk, createUser
	} = test.context
	const otherUsername = 'otheruser'
	const otherUser = await createUser(otherUsername, test.context.sdk)
	const otherUserSession = await sdk.card.create({
		slug: `session-${otherUser.slug}-integration-tests-${uuid()}`,
		type: 'session',
		version: '1.0.0',
		data: {
			actor: otherUser.id
		}
	})
	test.context = {
		...test.context,
		otherUser,
		otherUserSession
	}
})

ava.after(async (test) => {
	await helpers.after(test)
})

ava('pingQuery does not return messages on threads that the user has created', async (test) => {
	const {
		sdk,
		user,
		otherUserSession
	} = test.context

	// Threads made with the chat widget have these markers
	const threadMarkers = [ `${user.slug}+org-balena` ]

	const userThread = {
		name: 'my thread',
		type: 'support-thread@1.0.0',
		active: true,
		markers: threadMarkers,
		version: '1.0.0',
		data: {
			status: 'open',
			product: 'jellyfish',
			mentionsUser: [ 'user-fake' ],
			participants: [ user.id ]
		}
	}

	const thread = await sdk.card.create(userThread, 'support-thread@1.0.0')
	const threadCard = await sdk.getById(thread.id)

	// Login as other user to create the messages

	await sdk.auth.loginWithToken(otherUserSession.id)

	test.deepEqual(threadCard.markers, threadMarkers)

	const message = await sdk.event.create({
		target: threadCard,
		type: 'message',
		slug: `message-${uuid()}`,
		tags: [],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message: 'Hello @fake'
		}
	})

	const messageCard = await sdk.getById(message.id)

	test.deepEqual(messageCard.markers, threadMarkers)

	const pingQuery = getPingQuery(user, [], '')

	const pingsForUser = await sdk.query(pingQuery)

	test.is(pingsForUser.length, 0)
})

ava('pingQuery returns all one-on-one messages that include our user', async (test) => {
	const {
		sdk,
		user,
		otherUser,
		otherUserSession
	} = test.context

	// Make sure we are logged in as the other user
	await sdk.auth.loginWithToken(otherUserSession.id)

	// Check for situation where our slug is first or last in the marker
	const firstThreadMarkers = [ `${user.slug}+${otherUser.slug}` ]
	const secondThreadMarkers = [ `${otherUser.slug}+${user.slug}` ]

	const firstThreadData = {
		name: 'first thread',
		type: 'thread@1.0.0',
		active: true,
		markers: firstThreadMarkers,
		version: '1.0.0',
		data: {
			mentionsUser: [],
			participants: [ user.id, otherUser.id ]
		}
	}

	const secondThreadData = {
		name: 'second thread',
		type: 'thread@1.0.0',
		active: true,
		markers: secondThreadMarkers,
		version: '1.0.0',
		data: {
			mentionsUser: [],
			participants: [ user.id, otherUser.id ]
		}
	}

	const firstThread = await sdk.card.create(firstThreadData, 'thread@1.0.0')
	const secondThread = await sdk.card.create(secondThreadData, 'thread@1.0.0')

	const firstThreadCard = await sdk.getById(firstThread.id)
	const secondThreadCard = await sdk.getById(secondThread.id)

	test.deepEqual(firstThreadCard.markers, firstThreadMarkers)
	test.deepEqual(secondThreadCard.markers, secondThreadMarkers)

	const firstThreadMessageWithMention = {
		target: firstThreadCard,
		type: 'message',
		slug: `message-${uuid()}`,
		tags: [],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message: 'Hello'
		}
	}

	const secondThreadMessageWithMention = {
		target: firstThreadCard,
		type: 'message',
		slug: `message-${uuid()}`,
		tags: [],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message: 'Hello'
		}
	}

	const firstThreadMessage = await sdk.event.create(firstThreadMessageWithMention)
	const secondThreadMessage = await sdk.event.create(secondThreadMessageWithMention)

	const pingQuery = getPingQuery(user, [], '')
	const pingsForUser = await sdk.query(pingQuery)

	test.is(pingsForUser.length, 2)

	const pingIds = _.map(pingsForUser, (ping) => {
		return _.get(ping, [ 'id' ])
	})

	test.true(_.includes(pingIds, firstThreadMessage.id))
	test.true(_.includes(pingIds, secondThreadMessage.id))
})

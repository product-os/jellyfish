/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getPromiseResolver,
	getWrapper
} from '../../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import VideoLink from './VideoLink'

const sandbox = sinon.createSandbox()

const wrappingComponent = getWrapper().wrapper

const conferenceUrl = 'https://meet.google.com/some-meeting-code'

const card = {
	id: '1',
	type: 'user@1.0.0'
}

const types = [
	{
		id: '1',
		slug: 'user',
		name: 'User',
		version: '1.0.0'
	}
]

const theme = {
	colors: {
		text: {
			main: '#2A506F'
		},
		gray: {
			dark: '#9F9F9F'
		}
	}
}

ava.beforeEach(async (test) => {
	const sdk = {
		action: sandbox.fake.resolves({
			conferenceUrl
		})
	}

	const actions = {
		addNotification: sandbox.stub()
	}

	test.context.commonProps = {
		actions,
		sdk,
		theme,
		types
	}
})

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('Clicking on the link sends a google-meet action and then opens the link', async (test) => {
	const {
		commonProps
	} = test.context

	// This technique lets us wait until we know for sure the window.open method has
	// been called and we have stored the url argment
	let openedUrl = null
	const windowOpen = getPromiseResolver()
	window.open = (url) => {
		openedUrl = url
		windowOpen.resolver(url)
	}

	const videoLink =	await mount((
		<VideoLink card={card} {...commonProps}/>
	), {
		wrappingComponent
	})

	videoLink.find('Link').simulate('click')

	// Wait for the window.open method to be called
	await windowOpen.promise

	test.deepEqual(commonProps.sdk.action.lastArg, {
		card: card.id,
		action: 'action-google-meet@1.0.0',
		type: card.type,
		arguments: {}
	})
	test.is(openedUrl, conferenceUrl)
})

ava('An error notification is shown if the google-meet action fails', async (test) => {
	const {
		commonProps
	} = test.context

	// This technique lets us wait until we know for sure the addNotification method has
	// been called and we have stored the type argment
	let notificationType = null
	const addNotification = getPromiseResolver()
	commonProps.actions.addNotification = (type, text) => {
		notificationType = type
		addNotification.resolver(type)
	}

	commonProps.sdk.action = sandbox.fake.rejects('TestError')

	const videoLink =	await mount((
		<VideoLink card={card} {...commonProps}/>
	), {
		wrappingComponent
	})

	videoLink.find('Link').simulate('click')

	// Wait for the addNotification method to be called
	await addNotification.promise

	test.is(notificationType, 'danger')
})

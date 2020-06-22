/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	getWrapper
} from '../../../../test/ui-setup'
import {
	SetupProvider
} from '../../SetupProvider'

const {
	wrapper: Wrapper
} = getWrapper()

const wrapperWithSetup = ({
	children,
	sdk
}) => {
	return (
		<Wrapper>
			<SetupProvider sdk={sdk}>
				{ children }
			</SetupProvider>
		</Wrapper>
	)
}

const createTestContext = (test, sandbox) => {
	const getWithTimeline = sandbox.stub()
	getWithTimeline.resolves([])

	const createEvent = {
		id: 'fake-create-id',
		type: 'create@1.0.0'
	}
	const whisperEvent = {
		id: 'fake-whisper-id',
		type: 'whisper@1.0.0',
		data: {
			timestamp: new Date(),
			message: 'I am a whisper'
		}
	}

	const messageEvent = {
		id: 'fake-message-id',
		type: 'message@1.0.0',
		data: {
			timestamp: new Date(),
			message: 'I am a message'
		}
	}

	const updateEvent = {
		id: 'fake-update-id',
		type: 'update@1.0.0',
		data: {
			payload: {
				op: 'add',
				path: 'fake-path'
			}
		}
	}

	const user = {
		id: 'fake-user-id'
	}

	const getActor = sandbox.stub()
	getActor.resolves(user)

	const tail = [ createEvent, messageEvent, whisperEvent, updateEvent ]

	const eventProps = {
		card: {
			slug: 'fake-card'
		},
		selectCard: () => {
			return sandbox.stub()
		},
		getCard: sandbox.stub(),
		actions: {
			addNotification: sandbox.stub()
		},
		usersTyping: [],
		user,
		getActor,
		getWithTimeline,
<<<<<<< HEAD
		tail,
=======
>>>>>>> Implement reverse scrolling in InfiniteList.
		sdk: {
			card: {
				getWithTimeline
			}
		}
	}

	return {
		getWithTimeline,
		eventProps,
		tail,
		createEvent,
		whisperEvent,
		messageEvent,
		updateEvent
	}
}

export {
	createTestContext,
	wrapperWithSetup
}

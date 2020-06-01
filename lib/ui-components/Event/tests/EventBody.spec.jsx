/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../test/ui-setup'
import ava from 'ava'
import sinon from 'sinon'
import {
	shallow
} from 'enzyme'
import React from 'react'
import EventBody from '../EventBody'
import {
	card
} from './fixtures'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	test.context.commonProps = {
		enableAutocomplete: false,
		sendCommand: 'enter',
		onUpdateDraft: sandbox.fake(),
		onSaveEditedMessage: sandbox.fake(),
		types: [],
		user: {
			slug: 'test-user'
		},
		sdk: {},
		card,
		actor: {},
		isMessage: true,
		editedMessage: null,
		updating: false,
		addNotification: sandbox.fake(),
		messageOverflows: false,
		setMessageElement: sandbox.fake(),
		messageCollapsedHeight: 400
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('Auto-complete textarea is shown if message is being edited', (test) => {
	const {
		commonProps
	} = test.context
	const eventBody = shallow(
		<EventBody
			{...commonProps}
			editedMessage="test message"
			updating={false}
		/>
	)
	const autoCompleteTextarea = eventBody.find('[data-test="event__textarea"]')
	test.is(autoCompleteTextarea.length, 1)
})

ava('Edited message is shown in markdown if message is being updated', (test) => {
	const {
		commonProps
	} = test.context
	const editedMessage = 'test message'
	const eventBody = shallow(
		<EventBody
			{...commonProps}
			editedMessage={editedMessage}
			updating
		/>
	)
	const autoCompleteTextarea = eventBody.find('[data-test="event__textarea"]')
	test.is(autoCompleteTextarea.length, 0)
	const messageText = eventBody.find('[data-test="event-card__message-draft"]')
	test.is(messageText.props().children.trim(), editedMessage)
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../test/ui-setup'
import ava from 'ava'
import sinon from 'sinon'
import _ from 'lodash'
import {
	shallow
} from 'enzyme'
import React from 'react'
import EventBody, {
	getMessage
} from '../EventBody'
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

ava('getMessage detects a message that only contains an image url and wraps it', (test) => {
	const jpgURL = 'http://test.com/image.jpg?some-data=2'
	const pngURL = 'http://test.co.uk/image%20again.png?some-data=+2'
	const gifURL = 'https://wwww.test.com/image.gif'
	const imageMessage = (url) => {
		return `![image](${url})`
	}
	const getMessageInCard = (message) => {
		const newCard = _.merge(card, {
			data: {
				payload: {
					message
				}
			}
		})
		return getMessage(newCard)
	}
	test.is(getMessageInCard(jpgURL), imageMessage(jpgURL))
	test.is(getMessageInCard(pngURL), imageMessage(pngURL))
	test.is(getMessageInCard(gifURL), imageMessage(gifURL))
	test.is(getMessageInCard(` ${jpgURL}`), imageMessage(jpgURL))
	test.is(getMessageInCard(`${jpgURL} `), imageMessage(jpgURL))
	test.not(getMessageInCard(`>${jpgURL}`), imageMessage(jpgURL))
	test.not(getMessageInCard(`${jpgURL}!`), imageMessage(jpgURL))
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

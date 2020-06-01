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
import EventHeader from '../EventHeader'
import {
	card
} from './fixtures'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	test.context.commonProps = {
		isMessage: true,
		actor: {},
		card,
		threadIsMirrored: true,
		menuOptions: [],
		user: {
			slug: 'test-user'
		},
		updating: false,
		onEditMessage: sandbox.stub()
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('\'updating...\' is displayed if card is updating', (test) => {
	const {
		commonProps
	} = test.context
	const eventHeader = shallow(
		<EventHeader
			{...commonProps}
			updating
		/>
	)
	const status = eventHeader.find('[data-test="event-header__status"]')
	test.is(status.props().children[0], 'updating...')
})

ava('\'Edit Message\' is not available if the user did not write the message', (test) => {
	const {
		commonProps
	} = test.context
	const eventHeader = shallow(
		<EventHeader
			{...commonProps}
		/>
	)

	const trigger = eventHeader.find('[data-test="event-header__context-menu-trigger"]')
	trigger.simulate('click')
	eventHeader.update()

	// The 'Copy JSON' link is now shown but the 'Edit Message' link is not
	test.truthy(eventHeader.find('[data-test="event-header__link--copy-json"]').length)
	test.falsy(eventHeader.find('[data-test="event-header__link--edit-message"]').length)
})

ava('Clicking \'Edit Message\' calls the onEditMessage prop callback', (test) => {
	const {
		commonProps
	} = test.context
	const eventHeader = shallow(
		<EventHeader
			{...commonProps}
			user={{
				id: card.data.actor
			}}
		/>
	)

	const trigger = eventHeader.find('[data-test="event-header__context-menu-trigger"]')
	trigger.simulate('click')
	eventHeader.update()

	test.is(commonProps.onEditMessage.callCount, 0)
	eventHeader.find('[data-test="event-header__link--edit-message"]').simulate('click')
	test.is(commonProps.onEditMessage.callCount, 1)
})

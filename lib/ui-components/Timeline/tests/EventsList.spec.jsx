/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import React from 'react'
import sinon from 'sinon'
import {
	mount
} from 'enzyme'
import {
	createTestContext,
	wrapperWithSetup
} from './helpers'
import EventsList from '../EventsList'

const sandbox = sinon.createSandbox()

ava.before((test) => {
	test.context = createTestContext(test, sandbox)
})

ava('Only messages and whispers are displayed when the messagesOnly field is set', async (test) => {
	const {
<<<<<<< HEAD
		eventProps: {
			tail,
			...props
		},
=======
		eventProps,
		tail,
>>>>>>> Implement reverse scrolling in InfiniteList.
		createEvent,
		whisperEvent,
		messageEvent,
		updateEvent
	} = test.context

	const eventsList = await mount(
		<EventsList
<<<<<<< HEAD
			{...props}
			messagesOnly
			sortedTail={tail}
=======
			messagesOnly
			sortedEvents={tail}
			{ ...eventProps }
>>>>>>> Implement reverse scrolling in InfiniteList.
		/>,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
<<<<<<< HEAD
				sdk: props.sdk
=======
				sdk: eventProps.sdk
>>>>>>> Implement reverse scrolling in InfiniteList.
			}
		})
	const messages = eventsList.find(`div[data-test="${messageEvent.id}"]`)
	const whispers = eventsList.find(`div[data-test="${whisperEvent.id}"]`)
	const update = eventsList.find(`div[data-test="${updateEvent.id}"]`)
	const create = eventsList.find(`div[data-test="${createEvent.id}"]`)

	test.is(messages.length, 1)
	test.is(whispers.length, 1)
	test.is(update.length, 0)
	test.is(create.length, 0)
})

ava('Whispers are not shown if hideWhispers is set', async (test) => {
	const {
<<<<<<< HEAD
		eventProps: {
			tail,
			...props
		},
=======
		eventProps,
		tail,
>>>>>>> Implement reverse scrolling in InfiniteList.
		whisperEvent,
		messageEvent
	} = test.context

	const eventsList = await mount(
		<EventsList
<<<<<<< HEAD
			{...props}
			hideWhispers
			messagesOnly
			sortedTail={tail}
=======
			{ ...eventProps }
			hideWhispers
			messagesOnly
			sortedEvents={tail}
>>>>>>> Implement reverse scrolling in InfiniteList.
		/>,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
<<<<<<< HEAD
				sdk: props.sdk
=======
				sdk: eventProps.sdk
>>>>>>> Implement reverse scrolling in InfiniteList.
			}
		})

	const messages = eventsList.find(`div[data-test="${messageEvent.id}"]`)
	const whispers = eventsList.find(`div[data-test="${whisperEvent.id}"]`)

	test.is(messages.length, 1)
	test.is(whispers.length, 0)
})

ava('All events are shown if messagesOnly and hideWhispers are not set', async (test) => {
	const {
<<<<<<< HEAD
		eventProps: {
			tail,
			...props
		},
=======
		eventProps,
		tail,
>>>>>>> Implement reverse scrolling in InfiniteList.
		whisperEvent,
		messageEvent,
		updateEvent,
		createEvent
	} = test.context

	const eventsList = await mount(
		<EventsList
<<<<<<< HEAD
			{...props}
			sortedTail={tail}
=======
			sortedEvents={tail}
			{...eventProps}
>>>>>>> Implement reverse scrolling in InfiniteList.
		/>,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
<<<<<<< HEAD
				sdk: props.sdk
=======
				sdk: eventProps.sdk
>>>>>>> Implement reverse scrolling in InfiniteList.
			}
		})

	const messages = eventsList.find(`div[data-test="${messageEvent.id}"]`)
	const whispers = eventsList.find(`div[data-test="${whisperEvent.id}"]`)
	const update = eventsList.find(`div[data-test="${updateEvent.id}"]`)
	const create = eventsList.find(`div[data-test="${createEvent.id}"]`)

	test.is(messages.length, 1)
	test.is(whispers.length, 1)
	test.is(update.length, 1)
	test.is(create.length, 1)
})

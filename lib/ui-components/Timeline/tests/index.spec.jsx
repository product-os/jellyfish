/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import _ from 'lodash'
import React from 'react'
import sinon from 'sinon'
import {
	mount
} from 'enzyme'
import {
	createTestContext,
	wrapperWithSetup
} from './helpers'
import Timeline from '../'

const sandbox = sinon.createSandbox()

ava.before((test) => {
	test.context = createTestContext(test, sandbox)
})

ava('The TimelineStart component is rendered' +
	' when all the events in the timeline have been returned and rendered', async (test) => {
	const {
		eventProps
	} = test.context

	const timeline = await mount(
		<Timeline
			{...eventProps}
			tail={[]}
		/>, {
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk
			}
		})

	const timelineStart = timeline.find('div[data-test="Timeline__TimelineStart"]')
	test.is(timelineStart.text(), 'Beginning of Timeline')
})

ava('Events are toggled when the event in the url is one of type UPDATE', async (test) => {
	const {
		eventProps
	} = test.context

	const eventId = 'fake-update-id'

	// eslint-disable-next-line prefer-reflect
	delete window.location

	global.window.location = {
		search: `?event=${eventId}`
	}

	const getWithTimeline = sandbox.stub()
	getWithTimeline.resolves()

	const timeline = await mount(
		<Timeline
			{...eventProps}
			sdk={{
				card: {
					getWithTimeline
				}
			}}
			tail={[ {
				id: eventId,
				type: 'update@1.0.0',
				data: {
					payload: []
				}
			} ]}
		/>, {
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk
			}
		})
	const updateEvent = timeline.find(`div[data-test="${eventId}"]`)
	test.is(updateEvent.length, 1)
})

ava('Events are toggled when the event in the url is one of type CREATE', async (test) => {
	const {
		eventProps
	} = test.context

	const eventId = 'fake-create-id'

	// eslint-disable-next-line prefer-reflect
	delete window.location

	global.window.location = {
		search: `?event=${eventId}`
	}

	const getWithTimeline = sandbox.stub()
	getWithTimeline.resolves()

	const timeline = await mount(
		<Timeline
			{...eventProps}
			sdk={{
				card: {
					getWithTimeline
				}
			}}
			tail={[ {
				id: eventId,
				type: 'create@1,0,0'
			} ]}
		/>, {
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk
			}
		})
	const createEvent = timeline.find(`div[data-test="${eventId}"]`)
	test.is(createEvent.length, 1)
})

ava('getWithTimeline is used to get all the events for the timeline when' +
	'the event in the url is not present in our first page of results', async (test) => {
	const {
		eventProps
	} = test.context

	const eventId = 'fake-message-id'

	// eslint-disable-next-line prefer-reflect
	delete window.location

	global.window.location = {
		search: `?event=${eventId}`
	}

	const tail = _.times(20, (index) => {
		return {
			id: `fake-event-${index}`,
			type: 'message@1.0.0',
			data: {
				target: 'fake-target-id'
			}
		}
	})

	const getWithTimeline = sandbox.stub()
	getWithTimeline.resolves({
		links: {
			'has attached element': [ {
				id: eventId,
				type: 'message@1.0.0',
				data: {
					target: {
						id: 'fake-target-id'
					}
				}
			} ]
		}
	})

	await mount(
		<Timeline
			{...eventProps}
			sdk={{
				card: {
					getWithTimeline
				}
			}}
			tail={tail}
		/>, {
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk
			}
		})

	test.is(getWithTimeline.callCount, 1)
	test.deepEqual(getWithTimeline.args, [ [ 'fake-card', {
		queryOptions: {
			links: {
				'has attached element': {
					sortBy: 'created_at',
					sortDir: 'desc'
				}
			}
		}
	} ] ])
})

ava('A message is not removed from the pendingMessage list until it has been added to the tail', async (test) => {
	const {
		eventProps
	} = test.context

	const createMessage = sandbox.stub()
	createMessage.resolves()

	const addNotification = sandbox.stub()
	addNotification.resolves()

	const wrapper = await mount(
		<Timeline
			{...eventProps}
			setTimelineMessage={_.noop}
			tail={[]}
			sdk={{
				event: {
					create: createMessage
				}
			}
			}
			addNotification={addNotification}
		/>, {
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: eventProps.sdk
			}
		})

	const timeline = wrapper
		.childAt(0)
		.instance()

	await timeline.addMessage({
		preventDefault: _.noop,
		target: {
			value: 'Here is a new message'
		}
	})

	const pendingMessages = timeline.state.pendingMessages
	test.is(pendingMessages.length, 1)

	// Simulate the stream returning the pending message as part of the tail
	wrapper.setProps({
		tail: [ pendingMessages[0] ]
	})

	const updatedPendingMessages = timeline.state.pendingMessages
	test.is(updatedPendingMessages.length, 0)
})

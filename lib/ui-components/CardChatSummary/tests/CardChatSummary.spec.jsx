/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../test/ui-setup'
import {
	Provider
} from 'rendition'
import {
	Provider as ReduxProvider
} from 'react-redux'
import {
	MemoryRouter
} from 'react-router-dom'
import configureStore from 'redux-mock-store'
import _ from 'lodash'
import ava from 'ava'
import Bluebird from 'bluebird'
import {
	shallow,
	mount,
	configure
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import {
	CardChatSummary
} from '..'
import theme from './fixtures/theme.json'
import card from './fixtures/card.json'
import inlineImageMsg from './fixtures/msg-inline-image.json'
import user1 from './fixtures/user1.json'
import user2 from './fixtures/user2.json'

import Adapter from 'enzyme-adapter-react-16'

configure({
	adapter: new Adapter()
})

const middlewares = []
const mockStore = configureStore(middlewares)

const getActor = async (id) => {
	if (id === user1.id) {
		return user1
	}

	return user2
}

const getTimeline = (target) => {
	return _.sortBy(_.get(target.links, [ 'has attached element' ], []), 'data.timestamp')
}

const Wrapper = ({
	children
}) => {
	return (
		<MemoryRouter>
			<ReduxProvider store={mockStore({})}>
				<Provider>
					{children}
				</Provider>
			</ReduxProvider>
		</MemoryRouter>
	)
}

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<CardChatSummary
				active
				card={card}
				theme={theme}
				timeline={getTimeline(card)}
				getActor={getActor}
			/>
		)
	})
})

ava('It should change the actor after an update', async (test) => {
	const spy = sinon.spy(getActor)
	const timeline = getTimeline(card)

	const component = shallow(
		<CardChatSummary
			active
			card={card}
			theme={theme}
			timeline={timeline}
			getActor={spy}
		/>
	)

	// Check if getTimeline is used
	test.is(spy.callCount, 1)

	const newWhisper = {
		id: 'acbfc1ec-bf55-44aa-9361-910f52df3c05',
		data: {
			actor: '713a47bb-74f4-4506-ada7-e5b4060b8b6a',
			target: 'd967c40b-7495-4132-b2ff-16d16259d783',
			payload: {
				message: 'x',
				alertsUser: [],
				mentionsUser: []
			},
			timestamp: '2019-05-31T13:45:00.300Z'
		},
		name: null,
		slug: 'whisper-c643e8ee-df73-4592-b9d3-7c6e4f5ca72e',
		tags: [],
		type: 'whisper@1.0.0',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		linked_at: {
			'is attached to': '2019-05-31T13:45:00.783Z'
		},
		created_at: '2019-05-31T13:45:00.548Z',
		updated_at: null,
		capabilities: []
	}

	// Add the new whisper to the current
	// timeline and sort it by timestamp
	component.setProps({
		timeline: _.sortBy([ ...timeline, newWhisper ], 'data.timestamp')
	})

	await Bluebird.delay(500)

	test.is(component.state('actor').id, newWhisper.data.actor)
})

ava('Inline messages are transformed to a text representation', async (test) => {
	const component = await mount((
		<CardChatSummary
			active
			card={card}
			theme={theme}
			timeline={[ inlineImageMsg ]}
			getActor={getActor}
		/>
	), {
		wrappingComponent: Wrapper
	})
	const messageSummary = component.find('div[data-test="card-chat-summary__message"]')
	const messageSummaryText = messageSummary.text()
	test.is(messageSummaryText.trim(), '[some-image.png]')
})

ava('Links are transformed to include an onclick handler that stops propagation', async (test) => {
	const component = await mount((
		<CardChatSummary
			active
			card={card}
			theme={theme}
			timeline={[ inlineImageMsg ]}
			getActor={getActor}
		/>
	), {
		wrappingComponent: Wrapper
	})
	const messageSummary = component.find('div[data-test="card-chat-summary__message"]')

	// Because the Markdown component uses 'dangerouslySetInnerHtml' we need to work
	// with the raw html itself at this stage.
	const linkRegExp = new RegExp(/<a.+?>/)
	const link = linkRegExp.exec(messageSummary.html())
	const onClickRegExp = new RegExp(/onclick=".*stopPropagation.*"/)
	test.true(onClickRegExp.test(link))
})

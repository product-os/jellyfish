/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import Bluebird from 'bluebird'
import deepCopy from 'deep-copy'
import {
	shallow
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import CardChatSummary from '../'
import card from './fixtures/card.json'
import user1 from './fixtures/user1.json'
import user2 from './fixtures/user2.json'

const getActor = async (id) => {
	if (id === user1.id) {
		return user1
	}

	return user2
}

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<CardChatSummary
				active
				card={card}
				getActor={getActor}
			/>
		)
	})
})

ava('It should change the actor after an update', async (test) => {
	const spy = sinon.spy(getActor)

	const component = shallow(
		<CardChatSummary
			active
			card={card}
			getActor={spy}
		/>
	)

	test.is(spy.callCount, 1)

	const update = deepCopy(card)

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
		type: 'whisper',
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

	update.links['has attached element'].push(newWhisper)

	component.setProps({
		card: update
	})

	test.is(spy.callCount, 2)

	await Bluebird.delay(500)

	test.is(component.state().lastActor.id, newWhisper.data.actor)
})

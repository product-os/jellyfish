/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow,
	mount
} from 'enzyme'
import React from 'react'
import Event from '../Event'
import {
	card
} from './fixtures'

const user = {
	slug: 'user-johndoe'
}

const actor = {
	name: 'johndoe',
	email: 'johndoe@example.com',
	proxy: false,
	card: {}
}

const actions = {
	getActor: async () => {
		return actor
	}
}

const {
	wrapper
} = getWrapper()

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<Event
				actions={actions}
				card={card}
			/>
		)
	})
})

ava('It should display the actor\'s details', (test) => {
	const event = mount(
		<Event
			actions={actions}
			card={card}
			actor={actor}
			user={user}
		/>, {
			wrappingComponent: wrapper
		}
	)
	const avatar = event.find('Avatar')
	test.is(avatar.props().name, actor.name)
	const actorLabel = event.find('Txt[data-test="event__actor-label"]')
	test.is(actorLabel.props().tooltip, actor.email)
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../test/ui-setup'
import ava from 'ava'
import sinon from 'sinon'
import {
	shallow,
	mount
} from 'enzyme'
import React from 'react'
import Event from '../Event'
import {
	card
} from './fixtures'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'

const user = {
	slug: 'user-johndoe'
}

const actor = {
	name: 'johndoe',
	email: 'johndoe@example.com',
	proxy: false,
	card: {}
}

const {
	wrapper
} = getWrapper()

const sandbox = sinon.createSandbox()

const actions = {
	addNotification: sandbox.fake()
}

const commonProps = {
	actions,
	user,
	actor
}

ava.afterEach(() => {
	sandbox.restore()
})

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<Event
				{...commonProps}
				card={card}
			/>
		)
	})
})

ava('It should display the actor\'s details', (test) => {
	const event = mount(
		<Event
			{...commonProps}
			card={card}
		/>, {
			wrappingComponent: wrapper
		}
	)
	const avatar = event.find('Avatar')
	test.is(avatar.props().name, actor.name)
	const actorLabel = event.find('Txt[data-test="event__actor-label"]')
	test.is(actorLabel.props().tooltip, actor.email)
})

ava('A markdown message is displayed when the card is a message', async (test) => {
	const messageText = 'fake message text'
	const messageCard = {
		...card,
		type: 'message@1.0.0',
		data: {
			payload: {
				message: messageText
			}
		}
	}
	const event = mount(
		<Event
			{...commonProps}
			card={messageCard}
		/>, {
			wrappingComponent: wrapper
		}
	)
	const message = event.find(Markdown)
	test.is(message.text().trim(), messageText)
})

ava('Editing a message will update the mentions, alerts, tags and message', async (test) => {
	const author = {
		...user,
		id: card.data.actor
	}
	const mentionSlug = 'john'
	const alertSlug = 'paul'
	const mentionGroup = 'group1'
	const alertGroup = 'group2'
	const tag = 'ringo'
	const newMessage = `Test @${mentionSlug} !${alertSlug} @@${mentionGroup} !!${alertGroup} #${tag}`
	const expectedPatches = {
		'/tags/0': {
			op: 'add', path: '/tags/0', value: tag
		},
		'/data/payload/mentionsUser/0': {
			op: 'add',
			path: '/data/payload/mentionsUser/0',
			value: `user-${mentionSlug}`
		},
		'/data/payload/alertsUser/0': {
			op: 'add', path: '/data/payload/alertsUser/0', value: `user-${alertSlug}`
		},
		'/data/payload/mentionsGroup/0': {
			op: 'add',
			path: '/data/payload/mentionsGroup/0',
			value: mentionGroup
		},
		'/data/payload/alertsGroup/0': {
			op: 'add', path: '/data/payload/alertsGroup/0', value: alertGroup
		},
		'/data/payload/message': {
			op: 'replace',
			path: '/data/payload/message',
			value: newMessage
		}
	}

	const onUpdateCard = sandbox.stub().resolves(null)

	// HACK to get react-textarea-autosize not to complain
	// eslint-disable-next-line no-multi-assign
	global.getComputedStyle = global.window.getComputedStyle = () => {
		return {
			height: '100px',
			getPropertyValue: (name) => {
				return name === 'box-sizing' ? '' : null
			}
		}
	}

	const event = await mount(
		<Event
			{...commonProps}
			onUpdateCard={onUpdateCard}
			user={author}
			card={card}
		/>, {
			wrappingComponent: wrapper
		}
	)

	// Go into edit mode
	event.find('button[data-test="event-header__context-menu-trigger"]').simulate('click')
	event.find('a[data-test="event-header__link--edit-message"]').simulate('click')
	const autocomplete = event.find('AutoCompleteArea')

	// Force the change via the props (avoid interaction with react-textarea-autosize)
	autocomplete.props().onChange({
		target: {
			value: newMessage
		}
	})
	autocomplete.props().onSubmit()

	// Verify the onUpdateCard prop callback is called with the expected patch
	test.is(onUpdateCard.callCount, 1)
	test.is(onUpdateCard.getCall(0).args[0].id, card.id)

	// Use a Set here as we can't be sure of the order of patches in the patch array
	const updatePatches = onUpdateCard.getCall(0).args[1].reduce((acc, patch) => {
		acc[patch.path] = patch
		return acc
	}, {})
	test.deepEqual(updatePatches, expectedPatches)
})

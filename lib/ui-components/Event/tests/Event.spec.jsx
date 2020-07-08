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
import _ from 'lodash'
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

const otherUser = {
	slug: 'user-johndoe1'
}

const myGroup = 'group1'
const otherGroup = 'group11'
const tag = 'johndoe'

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

const tagRegex = ({
	prefix, token, isPersonal, isAlert
}) => {
	const hlTag = 'rendition-tag--hl.?'
	const personalTag = isPersonal ? 'rendition-tag--personal.?' : ''
	const alertTag = isAlert ? 'rendition-tag--alert.?' : ''
	return new RegExp(
		`<span.+?class=".?${hlTag}${personalTag}${alertTag}">${prefix}${token}</span>`
	)
}

const getMessageHtml = async (test) => {
	const author = {
		...user,
		id: card.data.actor
	}
	const groups = {
		[myGroup]: {
			users: [ user.slug ],
			name: myGroup,
			isMine: true
		},
		[otherGroup]: {
			users: [ otherUser.slug ],
			name: otherGroup
		}
	}
	const message = [
		'Test',
		`@${user.slug.slice(5)}`,
		`@${otherUser.slug.slice(5)}`,
		`!${user.slug.slice(5)}`,
		`!${otherUser.slug.slice(5)}`,
		`@@${myGroup}`,
		`@@${otherGroup}`,
		`!!${myGroup}`,
		`!!${otherGroup}`,
		`#${tag}`
	].join(' ')

	const event = await mount(
		<Event
			{...commonProps}
			user={author}
			groups={groups}
			card={_.defaultsDeep({
				tags: [ tag ],
				data: {
					payload: {
						mentionsUser: [ user.slug, otherUser.slug ],
						alertsUser: [ user.slug, otherUser.slug ],
						mentionsGroup: [ myGroup, otherGroup ],
						alertsGroup: [ myGroup, otherGroup ],
						message
					}
				}
			}, card)}
		/>, {
			wrappingComponent: wrapper
		}
	)

	const messageBody = event.find('div[data-test="event-card__message"]')
	test.is(messageBody.text().trim(), message)
	return messageBody.html()
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

ava('The event is marked as \'focused\' if the card\'s ID matches the \'event\' url param', (test) => {
	global.location.search = `?event=${card.id}`
	const event = mount(
		<Event
			{...commonProps}
			card={card}
		/>, {
			wrappingComponent: wrapper
		}
	)
	const eventWrapper = event.find(`div#event-${card.id}`)
	test.true(eventWrapper.hasClass('event--focused'))
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

ava('If user mention matches the authenticated user it is identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '@',
			token: user.slug.slice(5),
			isPersonal: true
		})
	)
})

ava('If user mention does not match the authenticated user it is not identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '@',
			token: otherUser.slug.slice(5),
			isPersonal: false
		})
	)
})

ava('If user alert matches the authenticated user it is identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '!',
			token: user.slug.slice(5),
			isPersonal: true,
			isAlert: true
		})
	)
})

ava('If user alert does not match the authenticated user it is not identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '!',
			token: otherUser.slug.slice(5),
			isPersonal: false,
			isAlert: true
		})
	)
})

ava('If group mention matches the authenticated user it is identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '@@',
			token: myGroup,
			isPersonal: true
		})
	)
})

ava('If group mention does not match the authenticated user it is not identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '@@',
			token: otherGroup,
			isPersonal: false
		})
	)
})

ava('If group alert matches the authenticated user it is identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '!!',
			token: myGroup,
			isPersonal: true,
			isAlert: true
		})
	)
})

ava('If group alert does not match the authenticated user it is not identified as \'personal\'', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '!!',
			token: otherGroup,
			isPersonal: false,
			isAlert: true
		})
	)
})

ava('Tags in messages are highlighted', async (test) => {
	test.regex(
		await getMessageHtml(test),
		tagRegex({
			prefix: '#',
			token: tag,
			isPersonal: false
		})
	)
})

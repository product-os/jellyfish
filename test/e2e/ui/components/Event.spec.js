/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

require('ts-node').register()

const ava = require('ava')
const {
	mount
} = require('enzyme')
const React = require('react')
const {
	Provider
} = require('rendition')
const {
	Event
} = require('../../../../lib/ui/components/Event')

ava('Event component should highlight usernames in messages', (test) => {
	const card = {
		active: true,
		capabilities: [],
		data: {
			actor: 'e9135e65-3044-44d4-98a1-faf37a504ae9',
			payload: {
				alertsUser: [],
				mentionsUser: [
					'e9135e65-3044-44d4-98a1-faf37a504ae9'
				],
				message: 'Hey @janedoe, what\'s up?'
			},
			target: 'ddf12680-8742-4421-99fd-7d64c3ccead4',
			timestamp: '2018-12-12T16:03:50.600Z'
		},
		id: '2b659978-c243-435b-969f-6458d80d17db',
		links: {
			'is attached to': [
				{
					$link: 'beb14a96-71c1-4492-aa84-d632d7bf69f5',
					id: 'ddf12680-8742-4421-99fd-7d64c3ccead4',
					slug: 'thread-7187cf4c-2dd9-48f5-8c46-92ec26b7bab1'
				}
			]
		},
		markers: [],
		requires: [],
		slug: 'message-68eebc68-46c6-4980-be17-d40ad5e3f047',
		tags: [],
		type: 'message',
		version: '1.0.0'
	}

	const users = [
		{
			slug: 'user-janedoe',
			id: 'e9135e65-3044-44d4-98a1-faf37a504ae9',
			data: {
				email: 'janedoe@example.com'
			}
		}
	]

	const component = mount(
		<Provider>
			<Event card={card} users={users} />
		</Provider>
	)

	const mark = component.render().find('.rendition-tag-hl').first()

	test.is(mark.text(), '@janedoe')
})

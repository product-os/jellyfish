/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const ava = require('ava')
const {
	generateActorFromUserCard
} = require('./helpers')

ava('generateActorFromUserCard can generate name from slug', (test) => {
	const card = {
		slug: 'user-foobar',
		links: {
			'is member of': [
				{
					slug: 'org-balena'
				}
			]
		}
	}
	const actor = generateActorFromUserCard(card)
	test.is(actor.name, 'foobar')
	test.is(actor.proxy, false)
})

ava('generateActorFromUserCard can generate name from handle', (test) => {
	const card = {
		slug: 'user-foobar',
		data: {
			handle: 'a-handle'
		}
	}
	const actor = generateActorFromUserCard(card)
	test.is(actor.name, '[a-handle]')
})

ava('generateActorFromUserCard can generate name from email', (test) => {
	const card = {
		slug: 'user-foobar',
		data: {
			email: 'user@test.com'
		}
	}
	const actor = generateActorFromUserCard(card)
	test.is(actor.name, '[user@test.com]')
})

ava('generateActorFromUserCard generates proxy, email and avatarUrl from card', (test) => {
	const card = {
		slug: 'user-foobar',
		data: {
			email: 'user@test.com',
			avatar: 'https://www.example.com'
		}
	}
	const actor = generateActorFromUserCard(card)
	test.is(actor.avatarUrl, 'https://www.example.com')
	test.is(actor.email, 'user@test.com')
	test.is(actor.proxy, true)
})

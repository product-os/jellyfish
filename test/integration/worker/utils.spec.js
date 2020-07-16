/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')
const utils = require('@balena/jellyfish-worker').utils
const {
	v4: uuid
} = require('uuid')

ava.serial.before(helpers.jellyfish.before)
ava.serial.after(helpers.jellyfish.after)

ava('.hasCard() id = yes (exists), slug = yes (exists)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: test.context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: card.id,
		version: '1.0.0',
		slug: card.slug
	}))
})

ava('.hasCard() id = yes (exists), slug = yes (not exist)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: test.context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: card.id,
		version: '1.0.0',
		slug: test.context.generateRandomSlug()
	}))
})

ava('.hasCard() id = yes (not exist), slug = yes (exists)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: test.context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: uuid(),
		version: '1.0.0',
		slug: card.slug
	}))
})

ava('.hasCard() id = yes (not exist), slug = yes (not exist)', async (test) => {
	test.false(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: uuid(),
		version: '1.0.0',
		slug: test.context.generateRandomSlug()
	}))
})

ava('.hasCard() id = no, slug = yes (exists)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: test.context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		version: '1.0.0',
		slug: card.slug
	}))
})

ava('.hasCard() id = no, slug = yes (not exist)', async (test) => {
	test.false(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug()
	}))
})

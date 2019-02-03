/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')
const utils = require('../../../lib/worker/utils')

ava.beforeEach(helpers.jellyfish.beforeEach)
ava.afterEach(helpers.jellyfish.afterEach)

ava('.hasCard() id = yes (exists), slug = yes (exists)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: card.id,
		slug: 'foo-bar'
	}))
})

ava('.hasCard() id = yes (exists), slug = yes (not exist)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: card.id,
		slug: 'foo-bar'
	}))
})

ava('.hasCard() id = yes (not exist), slug = yes (exists)', async (test) => {
	await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo-bar'
	}))
})

ava('.hasCard() id = yes (not exist), slug = yes (not exist)', async (test) => {
	test.false(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo-bar'
	}))
})

ava('.hasCard() id = no, slug = yes (exists)', async (test) => {
	await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0'
	})

	test.true(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		slug: 'foo-bar'
	}))
})

ava('.hasCard() id = no, slug = yes (not exist)', async (test) => {
	test.false(await utils.hasCard(test.context.context, test.context.jellyfish, test.context.session, {
		slug: 'foo-bar'
	}))
})

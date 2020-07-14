/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const sensibleDefaults = require('../../../../../../apps/server/default-cards/mixins/sensible-defaults')

ava('`sensibleDefaults` sets the version to \'1.0.0\'', (test) => {
	const card = sensibleDefaults({})

	test.is(card.version, '1.0.0')
})

ava('`sensibleDefaults` sets the markers to `[]`', (test) => {
	const card = sensibleDefaults({})

	test.deepEqual(card.markers, [])
})

ava('`sensibleDefaults` sets the tags to `[]`', (test) => {
	const card = sensibleDefaults({})

	test.deepEqual(card.tags, [])
})

ava('`sensibleDefaults` sets the links to `{}`', (test) => {
	const card = sensibleDefaults({})

	test.deepEqual(card.links, {})
})

ava('`sensibleDefaults` sets the active to `true`', (test) => {
	const card = sensibleDefaults({})

	test.deepEqual(card.active, true)
})

ava('`sensibleDefaults` sets the data to `{}`', (test) => {
	const card = sensibleDefaults({})

	test.deepEqual(card.data, {})
})

ava('`sensibleDefaults` sets the requires to `[]`', (test) => {
	const card = sensibleDefaults({})

	test.deepEqual(card.requires, [])
})

ava('`sensibleDefaults` sets the capabilities to `[]`', (test) => {
	const card = sensibleDefaults({})

	test.deepEqual(card.capabilities, [])
})

ava('`sensibleDefaults` never overwrites a property in the source card', (test) => {
	const card = sensibleDefaults({
		version: '2.0.0'
	})

	test.is(card.version, '2.0.0')
})

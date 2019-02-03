/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ava = require('ava')
const skhema = require('skhema')
const CARDS = require('../../../lib/core/cards')

const addCreatedField = (card) => {
	return Object.assign({
		created_at: new Date().toISOString()
	}, card)
}

const isCardMacro = async (test, type, card, expected) => {
	const schema = (await CARDS[type]).data.schema
	const cardWithCreation = addCreatedField(card)
	test.deepEqual(skhema.isValid(schema, cardWithCreation), expected)
}

isCardMacro.title = (title, type, card, expected) => {
	return `(${title}) skhema.valid() should return ${expected} using type ${type}`
}

_.each(CARDS, async (value, key) => {
	ava(`The "${key}" card should validate against the card type and its own type`, async (test) => {
		const card = await value
		const cardSchema = (await CARDS.card).data.schema
		const typeSchema = (await CARDS[card.type]).data.schema
		const cardWithCreation = addCreatedField(card)

		test.true(skhema.isValid(cardSchema, cardWithCreation))
		test.true(skhema.isValid(typeSchema, cardWithCreation))
	})
})

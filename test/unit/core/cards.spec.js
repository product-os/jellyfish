/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

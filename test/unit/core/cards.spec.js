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
const path = require('path')
const fs = require('fs')
const skhema = require('skhema')
const CARDS = require('../../../lib/core/cards')

const isCardMacro = async (test, type, card, expected) => {
	const schema = (await CARDS[type]).data.schema
	test.deepEqual(skhema.isValid(schema, card), expected)
}

isCardMacro.title = (title, type, card, expected) => {
	return `(${title}) skhema.valid() should return ${expected} using type ${type}`
}

const testCases = _.map(fs.readdirSync(path.join(__dirname, 'cards')), (file) => {
	return {
		name: file,
		json: require(path.join(__dirname, 'cards', file))
	}
})

testCases.forEach((testCase) => {
	ava(`examples: ${testCase.name}`, isCardMacro, 'card', testCase.json.card, testCase.json.valid)
})

_.each(CARDS, async (value, key) => {
	ava(`The "${key}" card should validate against the card type and its own type`, async (test) => {
		const card = await value
		const cardSchema = (await CARDS.card).data.schema
		const typeSchema = (await CARDS[card.type]).data.schema
		test.true(skhema.isValid(cardSchema, card))
		test.true(skhema.isValid(typeSchema, card))
	})
})

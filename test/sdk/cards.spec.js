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
const randomstring = require('randomstring')
const path = require('path')
const fs = require('fs')
const jsonSchema = require('../../lib/sdk/json-schema')
const CARDS = require('../../lib/sdk/cards')
const Kernel = require('../../lib/sdk/kernel')
const Backend = require('../../lib/sdk/backend')

ava.test.beforeEach(async (test) => {
	test.context.backend = new Backend({
		host: process.env.TEST_DB_HOST,
		port: process.env.TEST_DB_PORT,
		database: `test_${randomstring.generate()}`
	})

	await test.context.backend.connect()
	await test.context.backend.reset()

	test.context.buckets = {
		cards: 'cards',
		requests: 'requests',
		sessions: 'sessions'
	}

	test.context.kernel = new Kernel(test.context.backend, {
		buckets: test.context.buckets
	})

	await test.context.kernel.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.backend.disconnect()
})

const isCardMacro = async (test, type, card, expected) => {
	test.deepEqual(jsonSchema.isValid(test.context.kernel.getTypeSchema(type), card), expected)
}

isCardMacro.title = (title, type, card, expected) => {
	return `(${title}) jsonSchema.valid() should return ${expected} using type ${type.slug}`
}

_.each(_.map(fs.readdirSync(path.join(__dirname, 'cards')), (file) => {
	return {
		name: file,
		json: require(path.join(__dirname, 'cards', file))
	}
}), (testCase) => {
	ava.test('examples', isCardMacro, CARDS.card, testCase.json.card, testCase.json.valid)
})

_.each(CARDS, (value, key) => {
	ava.test(key, isCardMacro, CARDS.card, value, true)
	ava.test(key, isCardMacro, CARDS[value.type], value, true)
})

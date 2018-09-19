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

const ava = require('ava')
const helpers = require('./helpers')
const utils = require('../../../lib/worker/utils')

ava.test.beforeEach(helpers.jellyfish.beforeEach)
ava.test.afterEach(helpers.jellyfish.afterEach)

ava.test('.getActionArgumentsSchema() should return a wildcard schema if no args', (test) => {
	const schema = utils.getActionArgumentsSchema({
		data: {
			arguments: {}
		}
	})

	test.deepEqual(schema, {
		type: 'object'
	})
})

ava.test('.getActionArgumentsSchema() should parse one argument', (test) => {
	const schema = utils.getActionArgumentsSchema({
		data: {
			arguments: {
				foo: {
					type: 'object'
				}
			}
		}
	})

	test.deepEqual(schema, {
		type: 'object',
		properties: {
			foo: {
				type: 'object'
			}
		},
		additionalProperties: false,
		required: [ 'foo' ]
	})
})

ava.test('.getActionArgumentsSchema() should parse two arguments', (test) => {
	const schema = utils.getActionArgumentsSchema({
		data: {
			arguments: {
				foo: {
					type: 'object'
				},
				bar: {
					type: 'number'
				}
			}
		}
	})

	test.deepEqual(schema, {
		type: 'object',
		properties: {
			foo: {
				type: 'object'
			},
			bar: {
				type: 'number'
			}
		},
		additionalProperties: false,
		required: [ 'foo', 'bar' ]
	})
})

ava.test('.hasCard() id = yes (exists), slug = no', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.true(await utils.hasCard(test.context.jellyfish, test.context.session, {
		id: card.id
	}))
})

ava.test('.hasCard() id = yes (not exist), slug = no', async (test) => {
	test.false(await utils.hasCard(test.context.jellyfish, test.context.session, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	}))
})

ava.test('.hasCard() id = yes (exists), slug = yes (exists)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.true(await utils.hasCard(test.context.jellyfish, test.context.session, {
		id: card.id,
		slug: 'foo-bar'
	}))
})

ava.test('.hasCard() id = yes (exists), slug = yes (not exist)', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.true(await utils.hasCard(test.context.jellyfish, test.context.session, {
		id: card.id,
		slug: 'foo-bar'
	}))
})

ava.test('.hasCard() id = yes (not exist), slug = yes (exists)', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.true(await utils.hasCard(test.context.jellyfish, test.context.session, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo-bar'
	}))
})

ava.test('.hasCard() id = yes (not exist), slug = yes (not exist)', async (test) => {
	test.false(await utils.hasCard(test.context.jellyfish, test.context.session, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo-bar'
	}))
})

ava.test('.hasCard() id = no, slug = yes (exists)', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.true(await utils.hasCard(test.context.jellyfish, test.context.session, {
		slug: 'foo-bar'
	}))
})

ava.test('.hasCard() id = no, slug = yes (not exist)', async (test) => {
	test.false(await utils.hasCard(test.context.jellyfish, test.context.session, {
		slug: 'foo-bar'
	}))
})

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../../../../lib/ui/services/helpers')

ava('.createPrefixRegExp() match underscore characters', (test) => {
	const matchRE = helpers.createPrefixRegExp('@')
	const match = matchRE.exec('Lorem ipsum @user_name dolor sit amet')

	test.deepEqual(match[2], '@user_name')
})

ava('.getUpdateObjectFromSchema() should parse the `const` keyword', (test) => {
	const schema = {
		type: 'object',
		properties: {
			type: {
				const: 'message'
			},
			data: {
				type: 'object',
				properties: {
					number: {
						const: 1
					},
					string: {
						const: 'foobar'
					},
					boolean: {
						const: true
					}
				}
			}
		}
	}

	const result = helpers.getUpdateObjectFromSchema(schema)

	test.deepEqual(result, {
		type: 'message',
		data: {
			number: 1,
			string: 'foobar',
			boolean: true
		}
	})
})

ava('.getUpdateObjectFromSchema() should parse the `contains` keyword', (test) => {
	const schema = {
		type: 'object',
		properties: {
			tags: {
				contains: {
					const: 'i/frontend'
				}
			}
		}
	}

	const result = helpers.getUpdateObjectFromSchema(schema)

	test.deepEqual(result, {
		tags: [ 'i/frontend' ]
	})
})

ava('.getUserSlugsByPrefix() should get user ids by parsing text', (test) => {
	const source = '@johndoe'

	const result = helpers.getUserSlugsByPrefix('@', source)

	test.deepEqual(result, [ 'user-johndoe' ])
})

ava('.getUserSlugsByPrefix() should return an array of unique values', (test) => {
	const source = '@johndoe @johndoe @janedoe'

	const result = helpers.getUserSlugsByPrefix('@', source)

	test.deepEqual(result, [ 'user-johndoe', 'user-janedoe' ])
})

ava('.getUserSlugsByPrefix() should be able to use an exclamation mark as a prefix', (test) => {
	const source = '!johndoe'

	const result = helpers.getUserSlugsByPrefix('!', source)

	test.deepEqual(result, [ 'user-johndoe' ])
})

ava('.findWordsByPrefix() should ignore # symbols in urls', (test) => {
	const source = 'http://localhost:9000/#/231cd14d-e92a-4a19-bf16-4ce2535bf5c8'

	test.deepEqual(helpers.findWordsByPrefix('#', source), [])
})

ava('.findWordsByPrefix() should ignore @ symbols in email addresses', (test) => {
	const source = 'test@example.com'

	test.deepEqual(helpers.findWordsByPrefix('@', source), [])
})

ava('.findWordsByPrefix() should ignore symbols with no following test', (test) => {
	const source = '!'

	test.deepEqual(helpers.findWordsByPrefix('!', source), [])
})

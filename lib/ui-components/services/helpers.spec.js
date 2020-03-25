/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('./helpers')

const user = {
	slug: 'user',
	type: 'type@1.0.0',
	version: '1.0.0',
	name: 'Jellyfish User',
	data: {
		schema: {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						status: {
							oneOf: [
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'Do Not Disturb'
										},
										value: {
											type: 'string',
											const: 'DoNotDisturb'
										}
									}
								},
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'On Annual Leave'
										},
										value: {
											type: 'string',
											const: 'AnnualLeave'
										}
									}
								},
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'In a Meeting'
										},
										value: {
											type: 'string',
											const: 'Meeting'
										}
									}
								},
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'Available'
										},
										value: {
											type: 'string',
											const: 'Available'
										}
									}
								}
							]
						}
					}
				}
			}
		}
	}
}

ava('.slugify replaces non text with hyphens', (test) => {
	test.is(helpers.slugify('balena []{}#@io'), 'balena-io')
})

ava('.slugify converts text to lowercase', (test) => {
	test.is(helpers.slugify('Balena IO'), 'balena-io')
})

ava('.slugify strips any trailing spaces', (test) => {
	test.is(helpers.slugify('balena '), 'balena')
})

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
				const: 'message@1.0.0'
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
		type: 'message@1.0.0',
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

ava('.getUserStatuses() returns a dictionary of statuses if status is provided in schema', (test) => {
	const userStatuses = helpers.getUserStatuses(user)
	const dnd = userStatuses.DoNotDisturb
	test.is(dnd.title, 'Do Not Disturb')
	test.is(dnd.value, 'DoNotDisturb')
})

ava('.getUserStatuses() returns an empty object if status is missing from schema', (test) => {
	const userType = _.omit(user, 'data.schema.properties.data.properties.status')
	test.deepEqual(helpers.getUserStatuses(userType), {})
})

ava('.getRelationshipTargetType() returns top level type if defined', (test) => {
	const relationship = {
		type: 'some-type@1.0.0'
	}
	test.is(helpers.getRelationshipTargetType(relationship), 'some-type')
})

ava('.getRelationshipTargetType() returns query type if top level type not defined', (test) => {
	const relationship = {
		query: [
			{
				type: 'some-query-type@1.0.0'
			}
		]
	}
	test.is(helpers.getRelationshipTargetType(relationship), 'some-query-type')
})

ava('getActorIdFromCard gets the actor from the card data first', (test) => {
	const card = {
		id: '1',
		data: {
			actor: 'test-actor-id'
		}
	}
	test.is(helpers.getActorIdFromCard(card), 'test-actor-id')
})

ava('getActorIdFromCard gets the actor from the linked create card if card has no actor', (test) => {
	const card = {
		id: '2',
		data: {},
		links: {
			'has attached element': [
				{
					id: 'create-1',
					data: {
						actor: 'create-actor-id'
					},
					type: 'create@1.0.0'
				}
			]
		}
	}
	test.is(helpers.getActorIdFromCard(card), 'create-actor-id')
})

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
	const actor = helpers.generateActorFromUserCard(card)
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
	const actor = helpers.generateActorFromUserCard(card)
	test.is(actor.name, '[a-handle]')
})

ava('generateActorFromUserCard can generate name from email', (test) => {
	const card = {
		slug: 'user-foobar',
		data: {
			email: 'user@test.com'
		}
	}
	const actor = helpers.generateActorFromUserCard(card)
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
	const actor = helpers.generateActorFromUserCard(card)
	test.is(actor.avatarUrl, 'https://www.example.com')
	test.is(actor.email, 'user@test.com')
	test.is(actor.proxy, true)
})

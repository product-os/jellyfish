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
const helpers = require('../helpers')
const errors = require('../../../lib/actions/errors')

ava.test('should replace an existing card and add an update event using a slug', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'johndoe',
				data: {
					email: 'johndoe@example.com'
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					email: 'johndoe@gmail.com'
				}
			}
		}
	})

	test.is(result1.id, result2.id)

	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)

	test.deepEqual(card, result2)

	const timeline = await helpers.getTimeline(test.context.jellyfish, test.context.session, result1.id)
	test.deepEqual(_.map(timeline, 'type'), [ 'create', 'update' ])

	test.deepEqual(timeline[1].data.payload, {
		slug: 'johndoe',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@gmail.com'
		}
	})
})

ava.test('should replace an existing card and add an update event without using a slug', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 'bar'
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 'baz'
				}
			}
		}
	})

	test.is(result1.id, result2.id)

	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)

	test.deepEqual(card, result2)

	const timeline = await helpers.getTimeline(test.context.jellyfish, test.context.session, result1.id)
	test.deepEqual(_.map(timeline, 'type'), [ 'create', 'update' ])

	test.deepEqual(timeline[1].data.payload, {
		tags: [],
		links: [],
		active: true,
		data: {
			foo: 'baz'
		}
	})
})

ava.test('should fail if the target does not exist', async (test) => {
	const id = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	await test.throws(helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'johndoe',
				data: {
					email: 'johndoe@example.com'
				}
			}
		}
	}), errors.ActionsNoElement)
})

ava.test('should fail if the schema does not match', async (test) => {
	const result = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.throws(helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				foobar: true
			}
		}
	}), errors.ActionsSchemaMismatch)
})

ava.test('should add an extra property to a card', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'johndoe',
				data: {
					email: 'johndoe@example.com'
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					email: 'johndoe@gmail.com',
					foobar: true
				}
			}
		}
	})

	test.is(result1.id, result2.id)

	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)

	test.deepEqual(card, result2)

	const timeline = await helpers.getTimeline(test.context.jellyfish, test.context.session, result1.id)
	test.deepEqual(_.map(timeline, 'type'), [ 'create', 'update' ])

	test.deepEqual(timeline[1].data.payload, {
		slug: 'johndoe',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@gmail.com',
			foobar: true
		}
	})
})

ava.test('should be able to add a slug', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 'bar'
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'hey-there'
			}
		}
	})

	test.is(result1.id, result2.id)
	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)
	test.deepEqual(card, result2)
})

ava.test('should be able to set active to false', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 'bar'
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				active: false
			}
		}
	})

	test.is(result1.id, result2.id)
	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)
	test.deepEqual(card, result2)
})

ava.test('should override an array property', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'johndoe',
				data: {
					roles: [ 'guest' ]
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					roles: []
				}
			}
		}
	})

	test.is(result1.id, result2.id)
	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)
	test.deepEqual(card, result2)
})

ava.test('should re-evaluate formulas when updating an existing card', async (test) => {
	const type = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'test-type',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-type'
							},
							data: {
								type: 'object',
								properties: {
									foo: {
										type: 'string',
										$formula: 'UPPER(input)'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	const result = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 'hello'
				}
			}
		}
	})

	await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 'bye'
				}
			}
		}
	})

	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)

	test.deepEqual(card, {
		id: result.id,
		type: 'test-type',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'BYE'
		}
	})
})

ava.test('should consider changes to a formula in a type', async (test) => {
	const type = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'test-type',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-type'
							},
							data: {
								type: 'object',
								properties: {
									foo: {
										type: 'number',
										$formula: 'MAX(input, 5)'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: type.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 7
				}
			}
		}
	})

	test.deepEqual(result1, {
		id: result1.id,
		type: 'test-type',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 7
		}
	})

	await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: type.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-type'
							},
							data: {
								type: 'object',
								properties: {
									foo: {
										type: 'number',
										$formula: 'MAX(input, 8)'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-update-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					foo: 6
				}
			}
		}
	})

	test.deepEqual(result2, {
		id: result2.id,
		type: 'test-type',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 8
		}
	})
})

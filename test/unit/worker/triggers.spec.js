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
const triggers = require('../../../lib/worker/triggers')
const errors = require('../../../lib/worker/errors')
const Promise = require('bluebird')

ava.test.beforeEach(helpers.jellyfish.beforeEach)
ava.test.afterEach(helpers.jellyfish.afterEach)

ava.test('.getRequest() should return null if the filter only has a type but there is no match', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo'
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const request = await triggers.getRequest(trigger, {
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {}
	}, {
		currentDate: new Date(),
		matchCard: {
			type: 'card',
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {}
		}
	})

	test.falsy(request)
})

ava.test('.getRequest() should return a request if the filter only has a type and there is a match', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo'
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(trigger, {
		type: 'foo',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {}
	}, {
		currentDate: date,
		matchCard: {
			type: 'foo',
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {}
		}
	})

	test.deepEqual(request, {
		action: 'action-create-card',
		currentDate: date,
		card: typeCard.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	})
})

ava.test('.getRequest() should return a request if the input match card is null', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo'
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(trigger, {
		type: 'bar',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {}
	}, {
		currentDate: date,
		matchCard: null
	})

	test.deepEqual(request, {
		action: 'action-create-card',
		currentDate: date,
		card: typeCard.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	})
})

ava.test('.getRequest() should return a request if both the input card and the match card are null', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo'
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(trigger, null, {
		currentDate: date,
		matchCard: null
	})

	test.deepEqual(request, {
		action: 'action-create-card',
		currentDate: date,
		card: typeCard.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	})
})

ava.test('.getRequest() should return null if referencing source when no input card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo'
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: {
					$eval: 'source.type'
				}
			}
		}
	}

	const request = await triggers.getRequest(trigger, null, {
		currentDate: new Date(),
		matchCard: null
	})

	test.deepEqual(request, null)
})

ava.test('.getRequest() should return a request given a complex matching filter', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		filter: {
			type: 'object',
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo'
				},
				data: {
					type: 'object',
					required: [ 'foo' ],
					properties: {
						foo: {
							type: 'number'
						}
					}
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(trigger, {
		type: 'foo',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			foo: 4
		}
	}, {
		currentDate: date,
		matchCard: {
			type: 'foo',
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {
				foo: 4
			}
		}
	})

	test.deepEqual(request, {
		action: 'action-create-card',
		currentDate: date,
		card: typeCard.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	})
})

ava.test('.getRequest() should return null given a complex non-matching filter', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		filter: {
			type: 'object',
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo'
				},
				data: {
					type: 'object',
					required: [ 'foo' ],
					properties: {
						foo: {
							type: 'number'
						}
					}
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const request = await triggers.getRequest(trigger, {
		type: 'foo',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			foo: '4'
		}
	}, {
		currentDate: new Date(),
		matchCard: {
			type: 'foo',
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {
				foo: '4'
			}
		}
	})

	test.falsy(request)
})

ava.test('.getRequest() should parse source templates in the triggered action arguments', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		filter: {
			type: 'object',
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'command' ],
					properties: {
						command: {
							type: 'string',
							const: 'foo-bar-baz'
						}
					}
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: {
					$eval: 'source.data.slug'
				},
				data: {
					number: {
						$eval: 'source.data.number'
					}
				}
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(trigger, {
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			command: 'foo-bar-baz',
			slug: 'hello-world',
			number: 6
		}
	}, {
		currentDate: date,
		matchCard: {
			type: 'card',
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {
				command: 'foo-bar-baz',
				slug: 'hello-world',
				number: 6
			}
		}
	})

	test.deepEqual(request, {
		action: 'action-create-card',
		card: typeCard.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		currentDate: date,
		arguments: {
			properties: {
				slug: 'hello-world',
				data: {
					number: 6
				}
			}
		}
	})
})

ava.test('.getRequest() should parse timestamp templates in the triggered action arguments', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		filter: {
			type: 'object'
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				data: {
					timestamp: {
						$eval: 'timestamp'
					}
				}
			}
		}
	}

	const currentDate = new Date()

	const request = await triggers.getRequest(trigger, {
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			command: 'foo-bar-baz',
			slug: 'hello-world',
			number: 6
		}
	}, {
		currentDate,
		matchCard: {
			type: 'card',
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {
				command: 'foo-bar-baz',
				slug: 'hello-world',
				number: 6
			}
		}
	})

	test.deepEqual(request, {
		action: 'action-create-card',
		currentDate,
		card: typeCard.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				data: {
					timestamp: currentDate.toISOString()
				}
			}
		}
	})
})

ava.test('.getRequest() should return null if one of the templates is unsatisfied', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const trigger = {
		filter: {
			type: 'object',
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'command' ],
					properties: {
						command: {
							type: 'string',
							const: 'foo-bar-baz'
						}
					}
				}
			}
		},
		action: 'action-create-card',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: {
					$eval: 'source.data.slug'
				},
				data: {
					number: {
						$eval: 'source.data.number'
					}
				}
			}
		}
	}

	const request = await triggers.getRequest(trigger, {
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			command: 'foo-bar-baz',
			slug: 'hello-world'
		}
	}, {
		currentDate: new Date(),
		matchCard: {
			type: 'card',
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {
				command: 'foo-bar-baz',
				slug: 'hello-world'
			}
		}
	})

	test.falsy(request)
})

ava.test('.getTypeTriggers() should return a trigger card with a matching type', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const cards = [
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'foo',
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'command' ],
							properties: {
								command: {
									type: 'string',
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		}
	].map(test.context.kernel.defaults)

	const insertedCards = await Promise.map(cards, (card) => {
		return test.context.jellyfish.insertCard(test.context.session, card)
	})

	const updatedCard = await test.context.jellyfish.getCardById(test.context.session, insertedCards[0].id)

	const result = await triggers.getTypeTriggers(test.context.jellyfish, test.context.session, 'foo')
	test.deepEqual(result, [
		Object.assign({}, updatedCard, {
			id: result[0].id
		})
	])
})

ava.test('.getTypeTriggers() should not return inactive cards', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const cards = [
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			active: false,
			data: {
				type: 'foo',
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'command' ],
							properties: {
								command: {
									type: 'string',
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		}
	].map(test.context.kernel.defaults)

	for (const card of cards) {
		await test.context.jellyfish.insertCard(test.context.session, card)
	}

	const result = await triggers.getTypeTriggers(test.context.jellyfish, test.context.session, 'foo')
	test.deepEqual(result, [])
})

ava.test('.getTypeTriggers() should ignore non-matching cards', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const cards = [
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'foo',
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'command' ],
							properties: {
								command: {
									type: 'string',
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		},
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'bar',
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'command' ],
							properties: {
								command: {
									type: 'string',
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		}
	].map(test.context.kernel.defaults)

	const insertedCards = await Promise.map(cards, (card) => {
		return test.context.jellyfish.insertCard(test.context.session, card)
	})

	const result = await triggers.getTypeTriggers(test.context.jellyfish, test.context.session, 'foo')

	const updatedCard = await test.context.jellyfish.getCardById(test.context.session, insertedCards[0].id)

	test.deepEqual(result, [
		Object.assign({}, updatedCard, {
			id: result[0].id
		})
	])
})

ava.test('.getTypeTriggers() should ignore cards that are not triggered actions', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const cards = [
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'foo',
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'command' ],
							properties: {
								command: {
									type: 'string',
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		},
		{
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'card'
			}),
			version: '1.0.0',
			data: {
				type: 'foo',
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'command' ],
							properties: {
								command: {
									type: 'string',
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		}
	].map(test.context.kernel.defaults)

	const insertedCards = await Promise.map(cards, (card) => {
		return test.context.jellyfish.insertCard(test.context.session, card)
	})

	const result = await triggers.getTypeTriggers(test.context.jellyfish, test.context.session, 'foo')

	const updatedCard = await test.context.jellyfish.getCardById(test.context.session, insertedCards[0].id)
	test.deepEqual(result, [
		Object.assign({}, updatedCard, {
			id: result[0].id
		})
	])
})

ava.test('.getTypeTriggers() should not return triggered actions not associated with a type', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const cards = [
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'command' ],
							properties: {
								command: {
									type: 'string',
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		}
	].map(test.context.kernel.defaults)

	for (const card of cards) {
		await test.context.jellyfish.insertCard(test.context.session, card)
	}

	const result = await triggers.getTypeTriggers(test.context.jellyfish, test.context.session, 'foo')
	test.deepEqual(result, [])
})

ava.test('.getStartDate() should return epoch if the trigger has no start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getStartDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			filter: {
				type: 'object'
			},
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	})

	test.is(result.getTime(), 0)
})

ava.test('.getStartDate() should return epoch if the trigger has an invalid date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getStartDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			filter: {
				type: 'object'
			},
			startDate: 'foo',
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	})

	test.is(result.getTime(), 0)
})

ava.test('.getStartDate() should return the specified date if valid', async (test) => {
	const date = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getStartDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			filter: {
				type: 'object'
			},
			startDate: date.toISOString(),
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	})

	test.is(result.getTime(), date.getTime())
})

ava.test('.getNextExecutionDate() should return null if no interval', async (test) => {
	const date = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			filter: {
				type: 'object'
			},
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	}, date)

	test.deepEqual(result, null)
})

ava.test('.getNextExecutionDate() should return epoch if no last execution date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			interval: 'PT1H',
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	})

	test.is(result.getTime(), 0)
})

ava.test('.getNextExecutionDate() should return epoch if last execution date is not a valid date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			interval: 'PT1H',
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	}, new Date('foobar'))

	test.is(result.getTime(), 0)
})

ava.test('.getNextExecutionDate() should return epoch if last execution date is not a date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			interval: 'PT1H',
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	}, 'foobar')

	test.is(result.getTime(), 0)
})

ava.test('.getNextExecutionDate() should throw if the interval is invalid', async (test) => {
	const date = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	test.throws(() => {
		triggers.getNextExecutionDate({
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			active: true,
			links: {},
			tags: [],
			markers: [],
			data: {
				interval: 'FOOBARBAZ',
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: 'foo'
					}
				}
			}
		}, date)
	}, errors.WorkerInvalidDuration)
})

ava.test('.getNextExecutionDate() should return the next interval after the last execution', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			interval: 'PT1H',
			action: 'action-create-card',
			startDate: '2018-01-01T00:00:00.000Z',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	}, new Date('2018-01-01T05:30:00.000Z'))

	test.is(result.toISOString(), '2018-01-01T06:00:00.000Z')
})

ava.test('.getNextExecutionDate() should return the start date if the last execution ' +
				'happened way before the start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			interval: 'PT1H',
			action: 'action-create-card',
			startDate: '2018-01-01T05:00:00.000Z',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	}, new Date('2018-01-01T01:00:00.000Z'))

	test.is(result.toISOString(), '2018-01-01T05:00:00.000Z')
})

ava.test('.getNextExecutionDate() should return the subsequent interval if the last ' +
				' execution happened just before the start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			interval: 'PT1H',
			action: 'action-create-card',
			startDate: '2018-01-01T05:00:00.000Z',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	}, new Date('2018-01-01T04:50:00.000Z'))

	test.is(result.toISOString(), '2018-01-01T06:00:00.000Z')
})

ava.test('.getNextExecutionDate() should return the next interval if the last execution is the start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {
			interval: 'PT1H',
			action: 'action-create-card',
			startDate: '2018-01-01T05:00:00.000Z',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo'
				}
			}
		}
	}, new Date('2018-01-01T05:00:00.000Z'))

	test.is(result.toISOString(), '2018-01-01T06:00:00.000Z')
})

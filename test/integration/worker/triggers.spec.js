/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')
const triggers = require('../../../lib/worker/triggers')
const errors = require('../../../lib/worker/errors')
const Promise = require('bluebird')

ava.serial.beforeEach(helpers.jellyfish.beforeEach)
ava.serial.afterEach(helpers.jellyfish.afterEach)

ava('.getRequest() should return null if the filter only has a type but there is no match', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		mode: 'insert',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo@1.0.0'
				}
			}
		},
		action: 'action-create-card@1.0.0',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
		type: 'card@1.0.0',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {}
	}, {
		currentDate: new Date(),
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.falsy(request)
})

ava('.getRequest() should return a request if the filter only has a type and there is a match', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		mode: 'insert',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo@1.0.0'
				}
			}
		},
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
		type: 'foo@1.0.0',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		markers: [],
		data: {}
	}, {
		currentDate: date,
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.deepEqual(request, {
		action: 'action-create-card@1.0.0',
		currentDate: date,
		card: typeCard.id,
		context: test.context.context,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	})
})

ava('.getRequest() should return a request if the input card is null', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		mode: 'insert',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo@1.0.0'
				}
			}
		},
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(test.context.jellyfish, trigger, null, {
		currentDate: date,
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.deepEqual(request, {
		action: 'action-create-card@1.0.0',
		currentDate: date,
		card: typeCard.id,
		context: test.context.context,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	})
})

ava('.getRequest() should return null if referencing source when no input card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		mode: 'insert',
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo@1.0.0'
				}
			}
		},
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		arguments: {
			properties: {
				slug: {
					$eval: 'source.type'
				}
			}
		}
	}

	const request = await triggers.getRequest(test.context.jellyfish, trigger, null, {
		currentDate: new Date(),
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.deepEqual(request, null)
})

ava('.getRequest() should return a request given a complex matching filter', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		mode: 'insert',
		filter: {
			type: 'object',
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo@1.0.0'
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
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const date = new Date()

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
		type: 'foo@1.0.0',
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
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.deepEqual(request, {
		action: 'action-create-card@1.0.0',
		currentDate: date,
		card: typeCard.id,
		context: test.context.context,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	})
})

ava('.getRequest() should return null given a complex non-matching filter', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		mode: 'insert',
		filter: {
			type: 'object',
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'foo@1.0.0'
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
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
		type: 'foo@1.0.0',
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
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.falsy(request)
})

ava('.getRequest() should parse source templates in the triggered action arguments', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		mode: 'insert',
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
		action: 'action-create-card@1.0.0',
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

	const date = new Date()

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
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
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.deepEqual(request, {
		action: 'action-create-card@1.0.0',
		card: typeCard.id,
		context: test.context.context,
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

ava('.getRequest() should return the request if the mode matches on update', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
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
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		mode: 'update',
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

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
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
		context: test.context.context,
		session: test.context.session,
		mode: 'update'
	})

	test.deepEqual(request, {
		action: 'action-create-card@1.0.0',
		card: typeCard.id,
		context: test.context.context,
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

ava('.getRequest() should return the request if the mode matches on insert', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
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
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		mode: 'insert',
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

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
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
		context: test.context.context,
		session: test.context.session,
		mode: 'insert'
	})

	test.deepEqual(request, {
		action: 'action-create-card@1.0.0',
		card: typeCard.id,
		context: test.context.context,
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

ava('.getRequest() should return null if the mode does not match', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
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
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
		mode: 'update',
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

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
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
		context: test.context.context,
		session: test.context.session,
		mode: 'insert'
	})

	test.deepEqual(request, null)
})

ava('.getRequest() should parse timestamp templates in the triggered action arguments', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		mode: 'insert',
		filter: {
			type: 'object'
		},
		action: 'action-create-card@1.0.0',
		target: typeCard.id,
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

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
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
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.deepEqual(request, {
		action: 'action-create-card@1.0.0',
		currentDate,
		card: typeCard.id,
		context: test.context.context,
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

ava('.getRequest() should return null if one of the templates is unsatisfied', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const trigger = {
		mode: 'insert',
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
		action: 'action-create-card@1.0.0',
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

	const request = await triggers.getRequest(test.context.jellyfish, trigger, {
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
		mode: 'insert',
		context: test.context.context,
		session: test.context.session
	})

	test.falsy(request)
})

ava('.getTypeTriggers() should return a trigger card with a matching type', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	const cards = [
		{
			type: 'triggered-action@1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'foo@1.0.0',
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
				action: 'action-create-card@1.0.0',
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
		return test.context.jellyfish.insertCard(
			test.context.context, test.context.session, card)
	})

	const updatedCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, insertedCards[0].id)

	const result = await triggers.getTypeTriggers(
		test.context.context,
		test.context.jellyfish,
		test.context.session, 'foo@1.0.0')

	test.deepEqual(result, [
		Object.assign({}, updatedCard, {
			id: result[0].id
		})
	])
})

ava('.getTypeTriggers() should not return inactive cards', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const cards = [
		{
			type: 'triggered-action@1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			active: false,
			data: {
				type: 'foo@1.0.0',
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
				action: 'action-create-card@1.0.0',
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
		await test.context.jellyfish.insertCard(
			test.context.context, test.context.session, card)
	}

	const result = await triggers.getTypeTriggers(
		test.context.context,
		test.context.jellyfish,
		test.context.session, 'foo@1.0.0')

	test.deepEqual(result, [])
})

ava('.getTypeTriggers() should ignore non-matching cards', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const cards = [
		{
			type: 'triggered-action@1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'foo@1.0.0',
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
				action: 'action-create-card@1.0.0',
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
			type: 'triggered-action@1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'bar@1.0.0',
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
				action: 'action-create-card@1.0.0',
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
		return test.context.jellyfish.insertCard(
			test.context.context, test.context.session, card)
	})

	const result = await triggers.getTypeTriggers(
		test.context.context,
		test.context.jellyfish,
		test.context.session, 'foo@1.0.0')

	const updatedCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, insertedCards[0].id)

	test.deepEqual(result, [
		Object.assign({}, updatedCard, {
			id: result[0].id
		})
	])
})

ava('.getTypeTriggers() should ignore cards that are not triggered actions', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const cards = [
		{
			type: 'triggered-action@1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'foo@1.0.0',
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
				action: 'action-create-card@1.0.0',
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
			type: 'card@1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'card'
			}),
			version: '1.0.0',
			data: {
				type: 'foo@1.0.0',
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
				action: 'action-create-card@1.0.0',
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
		return test.context.jellyfish.insertCard(
			test.context.context, test.context.session, card)
	})

	const result = await triggers.getTypeTriggers(
		test.context.context,
		test.context.jellyfish,
		test.context.session, 'foo@1.0.0')

	const updatedCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, insertedCards[0].id)

	test.deepEqual(result, [
		Object.assign({}, updatedCard, {
			id: result[0].id
		})
	])
})

ava('.getTypeTriggers() should not return triggered actions not associated with a type', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const cards = [
		{
			type: 'triggered-action@1.0.0',
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
				action: 'action-create-card@1.0.0',
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
		await test.context.jellyfish.insertCard(
			test.context.context, test.context.session, card)
	}

	const result = await triggers.getTypeTriggers(
		test.context.context,
		test.context.jellyfish,
		test.context.session, 'foo@1.0.0')
	test.deepEqual(result, [])
})

ava('.getStartDate() should return epoch if the trigger has no start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getStartDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getStartDate() should return epoch if the trigger has an invalid date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getStartDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getStartDate() should return the specified date if valid', async (test) => {
	const date = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getStartDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should return null if no interval', async (test) => {
	const date = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should return epoch if no last execution date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should return epoch if last execution date is not a valid date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should return epoch if last execution date is not a date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should throw if the interval is invalid', async (test) => {
	const date = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	test.throws(() => {
		triggers.getNextExecutionDate({
			type: 'triggered-action@1.0.0',
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
				action: 'action-create-card@1.0.0',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: 'foo'
					}
				}
			}
		}, date)
	}, {
		instanceOf: errors.WorkerInvalidDuration
	})
})

ava('.getNextExecutionDate() should return the next interval after the last execution', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should return the start date if the last execution ' +
	'happened way before the start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should return the subsequent interval if the last ' +
	' execution happened just before the start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

ava('.getNextExecutionDate() should return the next interval if the last execution is the start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const result = triggers.getNextExecutionDate({
		type: 'triggered-action@1.0.0',
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
			action: 'action-create-card@1.0.0',
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

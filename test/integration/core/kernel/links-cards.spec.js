/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable max-len */

const ava = require('ava')
const helpers = require('../helpers')
const errors = require('../../../../lib/core/errors')

const context = {
	context: {}
}

// We want an isolated environment for every test.
ava.beforeEach(async () => {
	return helpers.before({
		context
	}, {
		suffix: 'relationship-tests'
	})
})

ava.afterEach(async () => {
	return helpers.after({
		context
	})
})

const relationshipTypeCard = {
	slug: 'relationship-is-driver-of-is-driven-by',
	type: 'type@1.0.0',
	version: '1.0.0',
	data: {
		schema: {
			type: 'object'
		},
		is_relationship: true,
		forward: 'is driver of',
		reverse: 'is driven by',
		type_pairs: [
			[
				{
					name: 'user', title: 'Driver'
				},
				'car'
			]
		]
	}
}

const carTypeCard = {
	slug: 'car',
	type: 'type@1.0.0',
	data: {
		schema: {
			type: 'object'
		}
	}
}

const timeMachineTypeCard = {
	slug: 'time-machine',
	type: 'type@1.0.0',
	data: {
		schema: {
			type: 'object'
		}
	}
}

ava('.linkCards() can link cards in forward direction when possible', async (test) => {
	const {
		kernel
	} = context

	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(relationshipTypeCard))
	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(carTypeCard))

	const cardA = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'user-marty',
		name: 'Marty McFly',
		type: 'user@1.0.0',
		data: {
			roles: [],
			hash: 'CHICKEN'
		}
	}))

	const cardB = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'delorean-dmc12',
		name: 'Delorean DMC-12',
		type: 'car@1.0.0'
	}))

	const link = await kernel.linkCards(context.context, kernel.sessions.admin, cardA, cardB,
		`${relationshipTypeCard.slug}@${relationshipTypeCard.version}`)

	test.is(link.name, relationshipTypeCard.data.forward)
	test.is(link.data.inverseName, relationshipTypeCard.data.reverse)
	test.true(link.data.is_link)
	test.is(link.data.from.type, cardA.type)
	test.is(link.data.from.id, cardA.id)
	test.is(link.data.to.type, cardB.type)
	test.is(link.data.to.id, cardB.id)
})

ava('.linkCards() can link cards in reverse direction when possible', async (test) => {
	const {
		kernel
	} = context

	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(relationshipTypeCard))
	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(carTypeCard))

	const cardA = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'user-marty',
		name: 'Marty McFly',
		type: 'user@1.0.0',
		data: {
			roles: [],
			hash: 'CHICKEN'
		}
	}))

	const cardB = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'delorean-dmc12',
		name: 'Delorean DMC-12',
		type: 'car@1.0.0'
	}))

	const link = await kernel.linkCards(context.context, kernel.sessions.admin, cardB, cardA,
		`${relationshipTypeCard.slug}@${relationshipTypeCard.version}`)

	test.is(link.name, relationshipTypeCard.data.reverse)
	test.is(link.data.inverseName, relationshipTypeCard.data.forward)
	test.true(link.data.is_link)
	test.is(link.data.from.type, cardB.type)
	test.is(link.data.from.id, cardB.id)
	test.is(link.data.to.type, cardA.type)
	test.is(link.data.to.id, cardA.id)
})

ava('.linkCards() will refuse to create links when the types don\'t match the relationship definition', async (test) => {
	const {
		kernel
	} = context

	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(relationshipTypeCard))
	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(timeMachineTypeCard))

	const cardA = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'user-marty',
		name: 'Marty McFly',
		type: 'user@1.0.0',
		data: {
			roles: [],
			hash: 'CHICKEN'
		}
	}))

	const cardB = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'delorean-dmc12',
		name: 'Delorean DMC-12',
		type: 'time-machine@1.0.0'
	}))

	await test.throwsAsync(async () => {
		await kernel.linkCards(context.context, kernel.sessions.admin, cardB, cardA,
			`${relationshipTypeCard.slug}@${relationshipTypeCard.version}`)
	}, {
		instanceOf: errors.JellyfishSchemaMismatch,
		message: 'Unable to link card of time-machine and user with relationship-is-driver-of-is-driven-by@1.0.0: unknown type relationship'
	})
})

ava('created links are present in the `links` table.', async (test) => {
	const {
		kernel
	} = context

	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(relationshipTypeCard))
	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(carTypeCard))

	const cardA = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'user-marty',
		name: 'Marty McFly',
		type: 'user@1.0.0',
		data: {
			roles: [],
			hash: 'CHICKEN'
		}
	}))

	const cardB = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'delorean-dmc12',
		name: 'Delorean DMC-12',
		type: 'car@1.0.0'
	}))

	const link = await kernel.linkCards(context.context, kernel.sessions.admin, cardB, cardA,
		`${relationshipTypeCard.slug}@${relationshipTypeCard.version}`)

	const rows = await kernel.backend.connection.any(`SELECT * FROM links WHERE id = '${link.id}'`)
	test.true(rows.length === 1)
})

ava('created links can be traversed in the normal fashion', async (test) => {
	const {
		kernel
	} = context

	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(relationshipTypeCard))
	await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults(carTypeCard))

	const cardA = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'user-marty',
		name: 'Marty McFly',
		type: 'user@1.0.0',
		data: {
			roles: [],
			hash: 'CHICKEN'
		}
	}))

	const cardB = await kernel.insertCard(context.context, kernel.sessions.admin, kernel.defaults({
		slug: 'delorean-dmc12',
		name: 'Delorean DMC-12',
		type: 'car@1.0.0'
	}))

	await kernel.linkCards(context.context, kernel.sessions.admin, cardB, cardA,
		`${relationshipTypeCard.slug}@${relationshipTypeCard.version}`)

	const result = await kernel.query(context.context, kernel.sessions.admin, {
		type: 'object',
		properties: {
			id: {
				const: cardA.id
			}
		},
		$$links: {
			'is driver of': {
				type: 'object',
				additionalProperties: true
			}
		}
	})

	test.is(result.length, 1)
	test.is(result[0].id, cardA.id)
	test.is(result[0].type, cardA.type)
	test.is(result[0].links['is driver of'].length, 1)
	test.is(result[0].links['is driver of'][0].id, cardB.id)
	test.is(result[0].links['is driver of'][0].type, cardB.type)
})

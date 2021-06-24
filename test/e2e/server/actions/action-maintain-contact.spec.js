/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const helpers = require('../../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

ava.serial('should elevate external event source', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const event = await test.context.sdk.card.create({
		slug: `external-event-${uuid()}`,
		type: 'external-event',
		data: {
			source: 'my-fake-service',
			headers: {},
			payload: {
				test: 1
			}
		}
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ],
			origin: event.id,
			profile: {
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)

	const contactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			origin: event.id,
			source: 'my-fake-service',
			profile: {
				email: 'johndoe@example.com',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})
})

ava.serial('should prettify name when creating user contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS',
			profile: {
				name: {
					first: 'john   ',
					last: '  dOE '
				}
			}
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)

	const contactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})
})

ava.serial('should link the contact to the user', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS'
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)

	const results = await test.context.sdk.query({
		$$links: {
			'has contact': {
				type: 'object',
				required: [ 'id', 'slug', 'type' ],
				additionalProperties: false,
				properties: {
					id: {
						type: 'string'
					},
					slug: {
						type: 'string'
					},
					type: {
						type: 'string'
					}
				}
			}
		},
		type: 'object',
		required: [ 'id', 'type', 'links' ],
		properties: {
			id: {
				type: 'string',
				const: userCard.id
			},
			links: {
				type: 'object'
			},
			type: {
				type: 'string',
				const: userCard.type
			}
		}
	})

	test.is(results.length, 1)
	test.deepEqual(results[0].links['has contact'], [
		{
			id: result.response.data.id,
			slug: result.response.data.slug,
			type: result.response.data.type
		}
	])
})

ava.serial('should be able to sync updates to user first names', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS',
			profile: {
				title: 'Frontend Engineer',
				name: {
					first: 'John'
				}
			}
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/profile/name/first',
						value: 'Johnny'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.sdk.card.get(result3.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {
					first: 'Johnny'
				}
			}
		}
	})
})

ava.serial('should apply a user patch to a contact that diverged', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS',
			profile: {
				title: 'Frontend Engineer'
			}
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: result1.response.data.id,
			type: result1.response.data.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'remove',
						path: '/data/profile/title'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/profile/title',
						value: 'Senior Frontend Engineer'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result3.response.error)

	const result4 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result4.response.error)

	const contactCard = await test.context.sdk.card.get(result4.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Senior Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should update the name of existing contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS',
			profile: {
				title: 'Frontend Engineer'
			}
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/name',
						value: 'John Doe'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.sdk.card.get(result3.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: 'John Doe',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should delete an existing contact if the user is deleted', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS',
			profile: {
				title: 'Frontend Engineer'
			}
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.sdk.card.get(result3.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: false,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should replace a property from an existing linked contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS',
			profile: {
				title: 'Frontend Engineer'
			}
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/profile/title',
						value: 'Senior Frontend Engineer'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.sdk.card.get(result3.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Senior Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should not remove a property from an existing linked contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS',
			profile: {
				title: 'Frontend Engineer'
			}
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'remove',
						path: '/data/profile/title'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.sdk.card.get(result3.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should merge and relink a diverging contact with a matching slug', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			profile: {
				company: 'Balena'
			},
			roles: [ 'user-community' ]
		}
	})

	const contact = await test.context.waitForMatch({
		type: 'object',
		required: [ 'slug' ],
		properties: {
			slug: {
				type: 'string',
				const: slug.replace(/^user-/, 'contact-')
			}
		}
	})

	const contactCard = await test.context.sdk.card.update(contact.id, contact.type, [
		{
			op: 'replace',
			path: '/data/profile/email',
			value: 'janedoe@example.com'
		},
		{
			op: 'add',
			path: '/data/profile/title',
			value: 'Frontend developer'
		}
	])

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)
	test.is(result.response.data.id, contactCard.id)

	const newContactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(newContactCard, {
		id: contactCard.id,
		slug: contactCard.slug,
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: newContactCard.linked_at,
		created_at: newContactCard.created_at,
		updated_at: newContactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend developer',
				company: 'Balena',
				name: {}
			}
		}
	})
})

ava.serial('should add a property to an existing linked contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/profile',
						value: {}
					},
					{
						op: 'add',
						path: '/data/profile/company',
						value: 'Balena'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.sdk.card.get(result3.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				company: 'Balena',
				name: {}
			}
		}
	})
})

ava.serial('should create a contact for a user with little profile info', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {}
			}
		}
	})
})

ava.serial('should use the user name when creating a contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		name: 'John Doe',
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: 'John Doe',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {}
			}
		}
	})
})

ava.serial('should create an inactive contact given an inactive user', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		active: false,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: false,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {}
			}
		}
	})
})

ava.serial('should create a contact for a user with plenty of info', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ],
			profile: {
				company: 'Balena.io',
				title: 'Senior Directory of the Jellyfish Task Force',
				type: 'professional',
				country: 'Republic of Balena',
				city: 'Contractshire',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				company: 'Balena.io',
				title: 'Senior Directory of the Jellyfish Task Force',
				country: 'Republic of Balena',
				city: 'Contractshire',
				type: 'professional',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})
})

ava.serial('should create a contact for a user with multiple emails', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.sdk.card.create({
		slug,
		type: 'user',
		data: {
			email: [ 'johndoe@example.com', 'johndoe@gmail.com' ],
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ],
			profile: {
				company: 'Balena.io',
				title: 'Senior Directory of the Jellyfish Task Force',
				type: 'professional',
				country: 'Republic of Balena',
				city: 'Contractshire',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact@1.0.0',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.sdk.card.get(result.response.data.slug)

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: contactCard.type,
		links: {},
		active: true,
		loop: null,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: [ 'johndoe@example.com', 'johndoe@gmail.com' ],
				company: 'Balena.io',
				title: 'Senior Directory of the Jellyfish Task Force',
				country: 'Republic of Balena',
				city: 'Contractshire',
				type: 'professional',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})
})

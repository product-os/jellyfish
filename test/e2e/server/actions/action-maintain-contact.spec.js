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

ava.before(helpers.before)
ava.after.always(helpers.after)

ava.beforeEach(helpers.beforeEach)
ava.afterEach.always(helpers.afterEach)

ava('should elevate external event source', async (test) => {
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

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(contactCard.data, {
		origin: event.id,
		source: 'my-fake-service',
		profile: {
			email: 'johndoe@example.com',
			name: {
				first: 'John',
				last: 'Doe'
			}
		}
	})
})

ava('should prettify name when creating user contact', async (test) => {
	const userCard = await test.context.sdk.card.create({
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

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(contactCard.data.profile.name, {
		first: 'John',
		last: 'Doe'
	})
})

ava('should link the contact to the user', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-community' ],
			hash: 'PASSWORDLESS'
		}
	})

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const results = await test.context.sdk.query({
		$$links: {
			'has contact': {
				type: 'object'
			}
		},
		type: 'object',
		required: [ 'id', 'type', 'links' ],
		properties: {
			id: {
				type: 'string',
				const: userCard.id
			}
		}
	})

	test.is(results.length, 1)
	test.is(results[0].links['has contact'][0].id, result.id)
})

ava('should be able to sync updates to user first names', async (test) => {
	const userCard = await test.context.sdk.card.create({
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

	await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.sdk.card.update(userCard.id, userCard.type, [
		{
			op: 'replace',
			value: 'Johnny',
			path: '/data/profile/name/first'
		}
	])

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(contactCard.data.profile, {
		email: 'johndoe@example.com',
		title: 'Frontend Engineer',
		name: {
			first: 'Johnny'
		}
	})
})

ava('should apply a user patch to a contact that diverged', async (test) => {
	const userCard = await test.context.sdk.card.create({
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

	const result1 = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.sdk.card.update(result1.id, result1.type, [
		{
			op: 'remove',
			path: '/data/profile/title'
		}
	])

	await test.context.sdk.card.update(userCard.id, userCard.type, [
		{
			op: 'replace',
			path: '/data/profile/title',
			value: 'Senior Frontend Engineer'
		}
	])

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.waitForMatch({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				const: result.type
			},
			data: {
				type: 'object',
				required: [ 'profile' ],
				properties: {
					profile: {
						type: 'object',
						required: [ 'title' ],
						properties: {
							title: {
								const: 'Senior Frontend Engineer'
							}
						}
					}
				}
			}
		}
	})

	// If we get a match the update worked
	test.pass()
})

ava('should update the name of existing contact', async (test) => {
	const userCard = await test.context.sdk.card.create({
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

	await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.sdk.card.update(userCard.id, userCard.type, [
		{
			op: 'replace',
			path: '/name',
			value: 'John Doe'
		}
	])

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.is(contactCard.name, 'John Doe')
})

ava('should delete an existing contact if the user is deleted', async (test) => {
	const userCard = await test.context.sdk.card.create({
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

	await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.sdk.card.remove(userCard.id, userCard.type)

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.is(contactCard.active, false)
})

ava('should replace a property from an existing linked contact', async (test) => {
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

	await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.sdk.card.update(userCard.id, userCard.type, [
		{
			op: 'replace',
			path: '/data/profile/title',
			value: 'Senior Frontend Engineer'
		}
	])

	const result3 = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result3.slug)

	test.is(contactCard.data.profile.title, 'Senior Frontend Engineer')
})

ava('should not remove a property from an existing linked contact', async (test) => {
	const userCard = await test.context.sdk.card.create({
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

	await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.sdk.card.update(userCard.id, userCard.type, [
		{
			op: 'remove',
			path: '/data/profile/title'
		}
	])

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.is(contactCard.data.profile.title, 'Frontend Engineer')
})

ava('should merge and relink a diverging contact with a matching slug', async (test) => {
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

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	test.is(result.id, contactCard.id)

	const newContactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(newContactCard.data.profile, {
		email: 'johndoe@example.com',
		title: 'Frontend developer',
		company: 'Balena',
		name: {}
	})
})

ava('should add a property to an existing linked contact', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	await test.context.sdk.card.update(userCard.id, userCard.type, [
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
	])

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(contactCard.data.profile, {
		email: 'johndoe@example.com',
		company: 'Balena',
		name: {}
	})
})

ava('should create a contact for a user with little profile info', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(contactCard.data, {
		profile: {
			email: 'johndoe@example.com',
			name: {}
		}
	})
})

ava('should use the user name when creating a contact', async (test) => {
	const userCard = await test.context.sdk.card.create({
		name: 'John Doe',
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.is(contactCard.name, 'John Doe')
})

ava('should create an inactive contact given an inactive user', async (test) => {
	const userCard = await test.context.sdk.card.create({
		active: false,
		type: 'user',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.is(contactCard.active, false)
})

ava('should create a contact for a user with plenty of info', async (test) => {
	const userCard = await test.context.sdk.card.create({
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

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(contactCard.data.profile, {
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
	})
})

ava('should create a contact for a user with multiple emails', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		data: {
			email: [ 'johndoe@example.com', 'johndoe@gmail.com' ],
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ],
			profile: {
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})

	const result = await test.context.sdk.action({
		card: userCard.id,
		type: userCard.type,
		action: 'action-maintain-contact@1.0.0'
	})

	const contactCard = await test.context.sdk.card.get(result.slug)

	test.deepEqual(
		contactCard.data.profile.email,
		[ 'johndoe@example.com', 'johndoe@gmail.com' ]
	)
})

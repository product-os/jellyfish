/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const bcrypt = require('bcrypt')
const helpers = require('../../sdk/helpers')
const typedErrors = require('typed-errors')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

const createUserDetails = () => {
	return {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial('.query() users with the role operator should be able to see view-all-users for their organisation', async (test) => {
	const {
		sdk
	} = test.context
	const userDetails = createUserDetails()

	const user = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-card@1.0.0',
		arguments: {
			reason: null,
			properties: {
				slug: `user-${userDetails.username}`,
				data: {
					hash: await bcrypt.hash(userDetails.password, 12),
					email: userDetails.email,
					roles: [ 'user-community', 'user-operator' ]
				}
			}
		}
	})

	const [ balenaOrg ] = await sdk.query({
		type: 'object',
		required: [ 'type', 'slug' ],
		properties: {
			type: {
				type: 'string',
				const: 'org@1.0.0'
			},
			slug: {
				type: 'string',
				const: 'org-balena'
			}
		}
	})

	await sdk.card.link(balenaOrg, user, 'has member')

	await sdk.auth.login(userDetails)

	const [ viewAllUsers ] = await test.context.sdk.query({
		type: 'object',
		required: [ 'type', 'slug' ],
		properties: {
			type: {
				type: 'string',
				const: 'view@1.0.0'
			},
			slug: {
				type: 'string',
				const: 'view-all-users'
			}
		}
	})

	test.is(viewAllUsers.slug, 'view-all-users')
	test.deepEqual(viewAllUsers.markers, [ 'org-balena' ])
})

ava.serial('the user-operator role can only be added to a user if they also have the community role', async (test) => {
	const {
		sdk
	} = test.context

	const {
		email,
		password,
		username
	} = createUserDetails()
	const hash = await bcrypt.hash(password, 12)

	const schemaMismatchError = typedErrors.makeTypedError('SchemaMismatch')

	await test.throwsAsync(sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-card@1.0.0',
		arguments: {
			reason: null,
			properties: {
				slug: `user-${username}`,
				data: {
					email,
					hash,
					roles: [ 'user-operator' ]
				}
			}
		}
	}, {
		instanceOf: schemaMismatchError
	})
	)
})

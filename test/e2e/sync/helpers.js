/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const helpers = require('../client-sdk/helpers')

exports.mirror = {
	before: async (test) => {
		await helpers.before(test)
	},
	after: async (test) => {
		await helpers.after(test)
	},
	beforeEach: async (test, username) => {
		await helpers.beforeEach(test)
		test.context.username = username

		// Create the user, only if it doesn't exist yet
		const userCard = await test.context.sdk.card.get(`user-${test.context.username}`) ||
			await test.context.sdk.action({
				card: 'user@1.0.0',
				type: 'type',
				action: 'action-create-user@1.0.0',
				arguments: {
					username: `user-${test.context.username}`,
					email: `${test.context.username}@example.com`,
					password: 'foobarbaz'
				}
			})

		// So it can access all the necessary cards, make the user a member of the
		// balena org
		const orgCard = await test.context.sdk.card.get('org-balena')

		await test.context.sdk.card.link(userCard, orgCard, 'is member of')

		// Force login, even if we don't know the password
		const session = await test.context.sdk.card.create({
			slug: `session-${userCard.slug}-integration-tests-${uuid()}`,
			type: 'session',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

		await test.context.sdk.auth.loginWithToken(session.id)
		test.context.user = await test.context.sdk.auth.whoami()
	},
	afterEach: helpers.afterEach
}

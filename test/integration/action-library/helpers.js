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

const uuid = require('uuid/v4')
const helpers = require('../sdk/helpers')

exports.before = async (test) => {
	await helpers.sdk.beforeEach(test)
}

exports.after = async (test) => {
	await helpers.sdk.afterEach(test)
}

exports.beforeEach = async (test, username) => {
	test.context.username = username

	// Create the user, only if it doesn't exist yet
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.jellyfish.sessions.admin,
		`user-${test.context.username}`) ||
		await test.context.sdk.auth.signup({
			username: test.context.username,
			email: `${test.context.username}@example.com`,
			password: 'foobarbaz'
		})

	// So it can access all the necessary cards
	userCard.data.roles = [ 'user-team' ]
	await test.context.jellyfish.insertCard(
		test.context.jellyfish.sessions.admin,
		userCard, {
			override: true
		})

	// Force login, even if we don't know the password
	const session = await test.context.jellyfish.insertCard(
		test.context.jellyfish.sessions.admin, {
			slug: `session-${userCard.slug}-integration-tests-${uuid()}`,
			type: 'session',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	await test.context.sdk.auth.loginWithToken(session.id)
	test.context.user = await test.context.sdk.auth.whoami()
}

exports.afterEach = async (test) => {
	await test.context.sdk.auth.logout()
}

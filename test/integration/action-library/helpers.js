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

const randomstring = require('randomstring')
const helpers = require('../sdk/helpers')

exports.before = async (test) => {
	await helpers.sdk.beforeEach(test)
}

exports.after = async (test) => {
	await helpers.sdk.afterEach(test)
}

exports.beforeEach = async (test) => {
	test.context.username = randomstring.generate().toLowerCase()
	const userDetails = {
		username: test.context.username,
		email: `${test.context.username}@example.com`,
		password: 'foobarbaz'
	}

	await test.context.sdk.auth.signup(userDetails)
	await test.context.sdk.auth.login(userDetails)
	test.context.user = await test.context.sdk.auth.whoami()

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.jellyfish.sessions.admin,
		`user-${test.context.username}`)

	// So it can access all the necessary cards
	card.data.roles = [ 'user-team' ]

	await test.context.jellyfish.insertCard(
		test.context.jellyfish.sessions.admin,
		card, {
			override: true
		})
}

exports.afterEach = async (test) => {
	await test.context.sdk.auth.logout()
}

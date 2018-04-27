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
const credentials = require('../../../lib/actions/credentials')

ava.test('should create a user', async (test) => {
	const salt = credentials.generateSalt()
	const hash = credentials.hash('foobar', salt)

	const id = await test.context.worker.executeAction(test.context.session, 'action-create-user', test.context.ids.user, {
		email: 'johndoe@example.com',
		username: 'johndoe',
		salt,
		hash
	})

	const card = await test.context.jellyfish.getCardById(test.context.session, id)

	test.deepEqual(card, {
		id,
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		tags: [],
		links: [],
		data: {
			email: 'johndoe@example.com',
			password: {
				salt,
				hash
			},
			roles: [
				'user-community'
			]
		}
	})
})

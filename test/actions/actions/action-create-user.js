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
const jellyscript = require('../../../lib/jellyscript')
const helpers = require('../helpers')

ava.test('should create a user', async (test) => {
	const credentials = {
		string: 'foobar',
		salt: 'user-johndoe'
	}

	const hash = jellyscript.evaluate('HASH(input)', {
		input: credentials
	}).value

	const result = await helpers.executeAction(test.context, {
		action: 'action-create-user',
		targetId: test.context.ids.user,
		actorId: test.context.actor.id,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: credentials
		}
	})

	test.deepEqual(result, {
		id: result.id,
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		tags: [],
		links: [],
		data: {
			email: 'johndoe@example.com',
			password: {
				hash
			},
			roles: [
				'user-community'
			]
		}
	})
})

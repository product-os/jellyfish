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

const nock = require('nock')

exports.examples = {
	api: {
		domain: 'https://jsonplaceholder.typicode.com',
		path: '/todos/1',
		status: 200,
		body: {
			userId: 1,
			id: 1,
			title: 'delectus aut autem',
			completed: false
		}
	},
	duff: {
		domain: 'duff'
	},
	err: {
		domain: 'https://www.example.com',
		path: '/duff.html',
		status: 404
	}
}

exports.nock = () => {
	nock(exports.examples.api.domain)
		.get(exports.examples.api.path)
		.reply(exports.examples.api.status, exports.examples.api.body)

	nock(exports.examples.err.domain)
		.get(exports.examples.err.path)
		.reply(exports.examples.err.status)
}

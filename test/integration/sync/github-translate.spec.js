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
const _ = require('lodash')
const helpers = require('./helpers')
const syncContext = require('../../../lib/action-library/sync-context')
const TOKEN = syncContext.getToken('github')

ava.beforeEach(helpers.translate.beforeEach)
ava.afterEach(helpers.translate.afterEach)

helpers.translate.scenario(TOKEN ? ava : ava.skip, {
	integration: require('../../../lib/sync/integrations/github'),
	scenarios: require('./webhooks/github'),
	slices: _.range(0, 3),
	baseUrl: 'https://api.github.com',
	stubRegex: /^\/repos\/.+\/.+\/issues\/\d+\/comments$/,
	source: 'github',
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization &&
			request.headers.authorization[0] === `token ${self.options.token}`
	}
})

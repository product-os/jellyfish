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

ava.test.beforeEach(helpers.integrations.beforeEach)
ava.test.afterEach(helpers.integrations.afterEach)

helpers.integrations.scenario(ava, {
	integration: require('../../../lib/action-library/integrations/front'),
	scenarios: require('./integrations/front'),
	slices: _.range(0, 2),
	baseUrl: 'https://api2.frontapp.com',
	stubRegex: /^\/conversations\/.+\/(messages|inboxes)$/,
	source: 'front',
	options: {
		token: 'xxxxxxxxxxxxxxxxxx'
	},
	isAuthorized: (self, request) => {
		return request.headers.authorization === `Bearer ${self.options.token}`
	}
})

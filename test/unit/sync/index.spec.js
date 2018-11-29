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
const helpers = require('./helpers')
const sync = require('../../../lib/sync')

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

ava('.isValidExternalEventRequest() should return true for github.com and the github provider', async (test) => {
	const result = sync.isValidExternalEventRequest('github.com', 'github')
	test.true(result)
})

ava('.isValidExternalEventRequest() should return true for api.github.com and the github provider', async (test) => {
	const result = sync.isValidExternalEventRequest('api.github.com', 'github')
	test.true(result)
})

ava('.isValidExternalEventRequest() should return false for frontapp.com and the github provider', async (test) => {
	const result = sync.isValidExternalEventRequest('frontapp.com', 'github')
	test.false(result)
})

ava('.isValidExternalEventRequest() should return false for github.com and the front provider', async (test) => {
	const result = sync.isValidExternalEventRequest('github.com', 'front')
	test.false(result)
})

ava('.isValidExternalEventRequest() should return false for an unknown provider', async (test) => {
	const result = sync.isValidExternalEventRequest('example.com', 'foobarbaz')
	test.false(result)
})

// For development

ava('.isValidExternalEventRequest() should return true for localhost and the github provider', async (test) => {
	const result = sync.isValidExternalEventRequest('localhost', 'github')
	test.true(result)
})

ava('.isValidExternalEventRequest() should return true for localhost and the front provider', async (test) => {
	const result = sync.isValidExternalEventRequest('localhost', 'front')
	test.true(result)
})

ava('.isValidExternalEventRequest() should return true for localhost and an unknown provider', async (test) => {
	const result = sync.isValidExternalEventRequest('localhost', 'foobarbaz')
	test.true(result)
})

ava('.isValidExternalEventRequest() should return true for an ngrok.io domain and the github provider', async (test) => {
	const result = sync.isValidExternalEventRequest('ecfb8151.ngrok.io', 'github')
	test.true(result)
})

ava('.isValidExternalEventRequest() should return true for an ngrok.io domain and the front provider', async (test) => {
	const result = sync.isValidExternalEventRequest('771c8025.ngrok.io', 'front')
	test.true(result)
})

ava('.isValidExternalEventRequest() should return true for an ngrok.io domain and an unknown provider', async (test) => {
	const result = sync.isValidExternalEventRequest('fabcd7d8.ngrok.io', 'foobarbaz')
	test.true(result)
})

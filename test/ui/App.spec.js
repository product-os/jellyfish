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

require('ts-node').register()

const ava = require('ava')
const Bluebird = require('bluebird')
const {
	mount
} = require('enzyme')
const React = require('react')
const {
	Provider
} = require('react-redux')
const App = require('../../lib/ui/App').default
const store = require('../../lib/ui/services/store').default
const randomstring = require('randomstring')
const Backend = require('../../lib/sdk/backend')
const Kernel = require('../../lib/sdk/kernel')
const errors = require('../../lib/sdk/errors')
const CARDS = require('../../lib/sdk/cards')


ava.test.beforeEach(async (test) => {
	test.context.backend = new Backend({
		host: process.env.TEST_DB_HOST,
		port: process.env.TEST_DB_PORT,
		database: `test_${randomstring.generate()}`
	})

	await test.context.backend.connect()
	await test.context.backend.reset()

	test.context.buckets = {
		cards: 'cards',
		requests: 'requests',
		sessions: 'sessions'
	}

	test.context.kernel = new Kernel(test.context.backend, {
		buckets: test.context.buckets
	})

	await test.context.kernel.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.backend.disconnect()
})

const waitForElement = async (component, selector, timeout = 30 * 1000) => {
	const waitFor = 500;

	if (component.find(selector).exists()) {
		console.log('found selector')
		return;
	}

	console.log('did not find selector')
	if (timeout < 0) {
		console.log('timeout is up')
		throw new Error(`Could not find selector ${selector}`)
	}

	await Bluebird.delay(waitFor)

	return waitForElement(component, selector, timeout - waitFor)
}

const app = mount(
	<Provider store={store}>
		<App />
	</Provider>
)

ava.test('should let new user\'s signup', async (test) => {
	await waitForElement(app, '.login-page')

	test.true(app.find('.login-page').exists())

	app.find('.login-signup-toggle').first().simulate('click')

	await waitForElement(app, '.login-page__signup')

	app.find('login-page__input--email').first()
		.simulate('change', { target: { 'johndoe@example.com' }})

	app.find('login-page__input--username').first()
		.simulate('change', { target: { 'johndoe' }})

	app.find('login-page__input--password').first()
		.simulate('change', { target: { 'foobarbaz' }})

	app.find('login-page__submit--signup').first()
		.simulate('click')

	await waitForElement(app, '.home-channel')

	test.true(app.find('.home-channel').exists())

	console.log('#############')
	console.log(app.html())
})

/*
ava.test('should load default views in the sidebar', async (test) => {
	await Bluebird.delay(2000)

	test.is(app.find('.home-channel').length, 1)

	await Bluebird.delay(2000)

	test.truthy(app.find('.home-channel__item').length)
})
*/

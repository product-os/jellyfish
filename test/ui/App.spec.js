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
const randomstring = require('randomstring')
const React = require('react')
const {
	Provider
} = require('react-redux')
const App = require('../../lib/ui/App').default
const store = require('../../lib/ui/services/store').default

ava.test.before(async (test) => {
	// Set this env var so that the server uses a random database
	process.env.SERVER_DATABASE = `test_${randomstring.generate()}`
	await require('../../lib/server.js')
	await Bluebird.delay(2000)
})

const USERNAME = `johndoe-${randomstring.generate()}`.toLowerCase()
const PASSWORD = 'foobarbaz'

const app = mount(
	<Provider store={store}>
		<App />
	</Provider>
)

const waitForElement = async (component, selector, timeout = 30 * 1000) => {
	const waitFor = 500
	let totalTime = 0

	while (true) {
		// Due to the way enzyme works we need to synchronously update the component
		// to register changes in redux
		component.update()

		if (component.find(selector).exists()) {
			break
		}

		if (totalTime > timeout) {
			throw new Error(`Could not find selector ${selector} in render tree after ${timeout}ms:\r${component.html()}`)
		}

		await Bluebird.delay(waitFor)

		totalTime += waitFor
	}

	return true
}

ava.test.serial('should let new users signup', async (test) => {
	await waitForElement(app, '.login-page')

	test.true(app.find('.login-page').exists())

	app.find('.login-signup-toggle').first().simulate('click')

	await waitForElement(app, '.login-page__signup')

	app.find('.login-page__input--email').first()
		.simulate('change', {
			target: {
				value: `${USERNAME}@example.com`
			}
		})

	app.find('.login-page__input--username').first()
		.simulate('change', {
			target: {
				value: USERNAME
			}
		})

	app.find('.login-page__input--password').first()
		.simulate('change', {
			target: {
				value: PASSWORD
			}
		})

	app.find('.login-page__submit--signup').first()
		.simulate('click')

	await waitForElement(app, '.home-channel', 60 * 1000)

	test.true(app.find('.home-channel').exists())
})

ava.test.serial('should let users logout', async (test) => {
	app.find('.user-menu-toggle').first().simulate('click')

	await waitForElement(app, '.user-menu')

	app.find('.user-menu__logout').first().simulate('click')

	await waitForElement(app, '.login-page')

	test.true(app.find('.login-page').exists())
})

ava.test.serial('should let users login', async (test) => {
	test.true(app.find('.login-page').exists())

	app.find('.login-page__input--username').first()
		.simulate('change', {
			target: {
				value: USERNAME
			}
		})

	app.find('.login-page__input--password').first()
		.simulate('change', {
			target: {
				value: PASSWORD
			}
		})

	app.find('.login-page__submit--login').first()
		.simulate('click')

	await waitForElement(app, '.home-channel', 60 * 1000)

	test.true(app.find('.home-channel').exists())
})

ava.test.serial('should render a list of views in the sidebar', async (test) => {
	test.true(app.find('.home-channel').exists())

	await waitForElement(app, '.home-channel__item')

	test.true(app.find('.home-channel__item').exists())
})

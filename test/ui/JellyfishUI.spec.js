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
const _ = require('lodash')
const randomstring = require('randomstring')
const React = require('react')
const {
	Provider
} = require('react-redux')
const createServer = require('../../lib/server')
const {
	JellyfishUI
} = require('../../lib/ui/JellyfishUI')
const {
	store
} = require('../../lib/ui/core')
const {
	changeInputValue,
	waitForElement,
	waitForThenClickElement
} = require('../test-helpers/ui-helpers')

const users = {
	community: {
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'password'
	},
	admin: {
		username: 'team-admin',
		email: 'team-admin@example.com',
		password: 'password'
	}
}

// An external context is used as t.context is not available in a `before`
// hook
const context = {}

ava.test.before(async (test) => {
	// Set this env var so that the server uses a random database
	process.env.SERVER_DATABASE = `test_${randomstring.generate()}`
	const {
		jellyfish,
		port
	} =	await createServer()

	context.jellyfish = jellyfish
	context.adminSession = jellyfish.sessions.admin
	context.serverPort = port
})

const app = mount(
	<Provider store={store}>
		<JellyfishUI />
	</Provider>
)

ava.test.serial('should let new users signup', async (test) => {
	// Because AVA tests concurrently, prevent port conflicts by setting the SDK
	// api url to whichever port the server eventually bound to
	window.sdk.setApiUrl(`http://localhost:${context.serverPort}`)

	await waitForElement(app, '.login-page')

	test.true(app.find('.login-page').exists())

	app.find('.login-signup-toggle').first().simulate('click')

	await waitForElement(app, '.login-page__signup')

	changeInputValue(app, '.login-page__input--email', users.community.email)
	changeInputValue(app, '.login-page__input--username', users.community.username)
	changeInputValue(app, '.login-page__input--password', users.community.password)

	app.find('.login-page__submit--signup').first()
		.simulate('click')

	await waitForElement(app, '.home-channel', 120 * 1000)

	test.true(app.find('.home-channel').exists())
})

ava.test.serial('should let users logout', async (test) => {
	app.find('.user-menu-toggle').first().simulate('click')

	await waitForElement(app, '.user-menu')

	app.find('.user-menu__logout').first().simulate('click')

	await waitForElement(app, '.login-page')

	test.true(app.find('.login-page').exists())

	// After logging out, the SDK should now longer have a session token available
	await test.throws(window.sdk.auth.whoami())
})

ava.test.serial('should let users login', async (test) => {
	test.true(app.find('.login-page').exists())

	changeInputValue(app, '.login-page__input--username', users.community.username)
	changeInputValue(app, '.login-page__input--password', users.community.password)

	app.find('.login-page__submit--login').first()
		.simulate('click')

	await waitForElement(app, '.home-channel', 120 * 1000)

	test.true(app.find('.home-channel').exists())
})

ava.test.serial('should render a list of views in the sidebar', async (test) => {
	test.true(app.find('.home-channel').exists())

	await waitForElement(app, '.home-channel__item')

	test.true(app.find('.home-channel__item').exists())
})

ava.test.serial('should render the community chat view for newly signed up users', async (test) => {
	app.find('.home-channel__item').filterWhere((node) => {
		return node && node.text() === 'All messages'
	})
		.first()
		.simulate('click')

	await waitForElement(app, '.column--view-all-messages')

	test.true(app.find('.column--view-all-messages').exists())
})

ava.test.serial('should allow newly signed up users to create new chat threads', async (test) => {
	await waitForElement(app, '.btn--add-thread')

	app.find('.btn--add-thread').first().simulate('click')

	await waitForElement(app, '.column--thread')

	test.true(app.find('.column--thread').exists())
})

ava.test.serial('should allow newly signed up users to create chat messages', async (test) => {
	const messageText = 'My new message'
	await waitForElement(app, '.new-message-input')

	changeInputValue(app, 'textarea', messageText)

	app.find('textarea').first()
		.simulate('keyPress', {
			key: 'Enter'
		})

	await waitForElement(app, '.event-card__message')

	// Trim any trailing line feeds when comparing the message
	test.is(app.find('.event-card__message').first().text().trim(), messageText)
})

ava.test.serial('should allow team-admin users to update user\'s roles', async (test) => {
	app.find('.user-menu-toggle').first().simulate('click')

	await waitForElement(app, '.user-menu')

	app.find('.user-menu__logout').first().simulate('click')

	await waitForElement(app, '.login-page')

	test.true(app.find('.login-page').exists())

	const teamAdminUser = await window.sdk.auth.signup(users.admin)

	// Give the new user the team-admin role
	const teamAdminUserCard = await context.jellyfish.getCardById(context.adminSession, teamAdminUser.id)
	await context.jellyfish.insertCard(
		context.adminSession,
		_.merge(teamAdminUserCard, {
			data: {
				roles: [ 'team-admin' ]
			}
		}),
		{
			override: true
		}
	)

	changeInputValue(app, '.login-page__input--username', users.admin.username)
	changeInputValue(app, '.login-page__input--password', users.admin.password)
	app.find('.login-page__submit--login').first()
		.simulate('click')

	// Open `All users` view
	await waitForThenClickElement(app, '.home-channel__item--view-all-users', 120 * 1000)

	// Select the community user
	await waitForThenClickElement(app, `.list-item--user-${users.community.username}`)

	// Add a small delay to allow the data stream to intialise, normally this is
	// an unnoticeable delay, but the test run fast enough to cause a race
	// condition, where the card update can happen before the stream initialises,
	// resulting in the timeline never being updated
	await Bluebird.delay(500)

	// Edit the community user
	await waitForThenClickElement(app, '.card-actions__btn--edit')

	// Add a new element to the `roles` array
	await waitForThenClickElement(app, '.field-array .btn-add')

	await waitForElement(app, '#root_data_roles_1')

	// Enter the 'user-team' role as a new role
	changeInputValue(app, '#root_data_roles_1 input', 'user-team')

	// Add a small delay to allow the form change to propagate
	await Bluebird.delay(500)

	// Submit the form
	await waitForThenClickElement(app, '.card-edit-modal__submit')

	// To detect the change we need to be able to see update cards in the timeline
	// Toggle the checkbox on to show additional information
	app.find('.timeline__checkbox--additional-info').first()
		.simulate('change', {
			target: {
				checked: true
			}
		})

	// Allow some time for the request to process
	await waitForElement(app, '.event-card--update')

	// Retrieve the user card
	const card = await window.sdk.card.get(`user-${users.community.username}`)

	test.deepEqual(card.data.roles, [ 'user-community', 'user-team' ])
})

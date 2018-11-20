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
const Bluebird = require('bluebird')
const _ = require('lodash')
const randomstring = require('randomstring')
const helpers = require('./helpers')

const WAIT_OPTS = {
	timeout: 180 * 1000
}

const context = {}

// Using page.type to change this input field regularly cuases characters to
// be "dropped" - the workaround here is to use a script to set the value of
// the input, and then trigger a change event that React can respond to
const setInputValue = async (page, selector, value) => {
	return page.evaluate((params) => {
		const input = document.querySelector(params.selector)
		const lastValue = input.value
		input.value = params.value
		const event = new window.Event('input', {
			bubbles: true
		})
		const tracker = _.get(input, [ '_valueTracker' ])
		if (tracker) {
			tracker.setValue(lastValue)
		}
		input.dispatchEvent(event)
	}, {
		selector,
		value
	})
}

const users = {
	community: {
		username: `johndoe-${randomstring.generate().toLowerCase()}`,
		email: `johndoe-${randomstring.generate().toLowerCase()}@example.com`,
		password: 'password'
	},
	admin: {
		username: `team-admin-${randomstring.generate().toLowerCase()}`,
		email: `team-admin-${randomstring.generate().toLowerCase()}@example.com`,
		password: 'password'
	}
}

ava.test.before(async () => {
	await helpers.browser.beforeEach({
		context
	})
})

ava.test.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.test.serial('should let new users signup', async (test) => {
	const {
		page,
		server
	} = context

	await page.goto(`http://localhost:${server.port}`)

	await page.waitForSelector('.login-page', WAIT_OPTS)

	await page.click('.login-signup-toggle')

	await page.waitForSelector('.login-page__signup', WAIT_OPTS)

	await page.type('.login-page__input--email', users.community.email)
	await page.type('.login-page__input--username', users.community.username)
	await page.type('.login-page__input--password', users.community.password)
	await page.type('.login-page__input--confirm-password', users.community.password)

	await page.click('.login-page__submit--signup')

	await page.waitForSelector('.home-channel', WAIT_OPTS)

	test.pass()
})

ava.test.serial('should let users logout', async (test) => {
	const {
		page
	} = context

	await page.click('.user-menu-toggle')

	await page.waitForSelector('.user-menu', WAIT_OPTS)

	await page.click('.user-menu__logout')

	await page.waitForSelector('.login-page', WAIT_OPTS)

	test.pass()
})

ava.test.serial('should let users login', async (test) => {
	const {
		page
	} = context

	await page.waitForSelector('.login-page', WAIT_OPTS)

	await page.type('.login-page__input--username', users.community.username)
	await page.type('.login-page__input--password', users.community.password)

	await page.click('.login-page__submit--login')

	await page.waitForSelector('.home-channel', WAIT_OPTS)

	test.pass()
})

ava.test.serial('should render a list of views in the sidebar', async (test) => {
	const {
		page
	} = context

	await page.waitForSelector('.home-channel', WAIT_OPTS)

	await page.waitForSelector('.home-channel__item', WAIT_OPTS)

	test.pass()
})

ava.test.serial('should render the community chat view for newly signed up users', async (test) => {
	const {
		page
	} = context

	await page.$$eval('.home-channel__item', (nodes) => {
		for (const node of nodes) {
			if (node.textContent === 'All messages') {
				return node.click()
			}
		}
		throw new Error('"All messages" link not found in sidebar')
	})

	await page.waitForSelector('.column--view-all-messages', WAIT_OPTS)

	test.pass()
})

ava.test.serial('should allow newly signed up users to create new chat threads', async (test) => {
	const {
		page
	} = context

	await page.waitForSelector('.btn--add-thread', WAIT_OPTS)

	await page.click('.btn--add-thread')

	await page.waitForSelector('.column--thread', WAIT_OPTS)

	test.pass()
})

ava.test.serial('should allow newly signed up users to create chat messages', async (test) => {
	const {
		page
	} = context
	const messageText = 'My new message'

	await page.waitForSelector('.new-message-input', WAIT_OPTS)

	await page.type('textarea', messageText)

	await page.keyboard.press('Enter')

	await page.waitForSelector('.column--thread .event-card__message', WAIT_OPTS)

	const result = await page.$eval('.column--thread .event-card__message', (node) => {
		return node.innerText.trim()
	})

	// Trim any trailing line feeds when comparing the message
	test.is(result, messageText)
})

ava.test.serial('should highlight tags in chat messages', async (test) => {
	const {
		page
	} = context
	const messageText = '#test'

	await page.waitForSelector('.new-message-input', WAIT_OPTS)

	await page.type('textarea', messageText)

	await page.keyboard.press('Enter')

	await page.waitForSelector('.column--thread .event-card__message', WAIT_OPTS)

	await page.waitForSelector('.column--thread .event-card__message .rendition-tag-hl', WAIT_OPTS)

	test.pass()
})

ava.test.serial('should allow team-admin users to update user\'s roles', async (test) => {
	const {
		page
	} = context

	await page.waitForSelector('.user-menu-toggle', WAIT_OPTS)

	await page.click('.user-menu-toggle')

	await page.waitForSelector('.user-menu', WAIT_OPTS)

	await page.click('.user-menu__logout')

	await page.waitForSelector('.login-page', WAIT_OPTS)

	const teamAdminUser = await page.evaluate((admin) => {
		return window.sdk.auth.signup(admin)
	}, users.admin)

	// Give the new user the team-admin role
	const teamAdminUserCard = await context.server.jellyfish.getCardById(context.session, teamAdminUser.id)
	await context.server.jellyfish.insertCard(
		context.session,
		_.merge(teamAdminUserCard, {
			data: {
				roles: [ 'user-team-admin' ]
			}
		}),
		{
			override: true
		}
	)

	await page.type('.login-page__input--username', users.admin.username)
	await page.type('.login-page__input--password', users.admin.password)

	await page.click('.login-page__submit--login')

	// Open `All users` view
	await page.waitForSelector('.home-channel__item--view-all-users', WAIT_OPTS)
	await page.click('.home-channel__item--view-all-users')

	// Wait for results to appear in the view
	await page.waitForSelector('.header-link', WAIT_OPTS)

	// Search for the username so that the link appears in view
	await setInputValue(page, '.column--view-all-users input', users.community.username)

	// Select the community user
	await page.waitForSelector(`.header-link--user-${users.community.username}`, WAIT_OPTS)
	await page.click(`.header-link--user-${users.community.username}`)

	// Add a small delay to allow the data stream to intialise, normally this is
	// an unnoticeable delay, but the test run fast enough to cause a race
	// condition, where the card update can happen before the stream initialises,
	// resulting in the timeline never being updated
	await Bluebird.delay(500)

	// Edit the community user
	await page.waitForSelector('.card-actions__btn--edit', WAIT_OPTS)
	await page.click('.card-actions__btn--edit')

	// Add a new element to the `roles` array
	await page.waitForSelector('.field-array .rendition-form-array-item__add-item', WAIT_OPTS)
	await page.click('.field-array .rendition-form-array-item__add-item')

	await page.waitForSelector('#root_data_roles_1', WAIT_OPTS)

	// Enter the 'user-team' role as a new role
	// Using page.type to change this input field regularly cuases characters to
	// be "dropped" - the workaround here is to use a script to set the value of
	// the input, and then trigger a change event that React can respond to
	await setInputValue(page, '#root_data_roles_1', 'user-team')

	// Add a small delay to allow the form change to propagate
	await Bluebird.delay(500)

	// Submit the form
	await page.click('.card-edit-modal__submit')

	// To detect the change we need to be able to see update cards in the timeline
	// Toggle the checkbox on to show additional information
	await page.click('.timeline__checkbox--additional-info')

	// Allow some time for the request to process
	await page.waitForSelector('.event-card--update', WAIT_OPTS)

	// Retrieve the user card
	const card = await page.evaluate((username) => {
		return window.sdk.card.get(`user-${username}`)
	}, users.community.username)

	test.deepEqual(card.data.roles, [ 'user-community', 'user-team' ])
})

ava.test.serial('After updating a user\'s roles, the other user fields should remain intact', async (test) => {
	// Retrieve the user card
	const userCard = await context.server.jellyfish.getCardBySlug(context.session, `user-${users.community.username}`)

	test.is(_.has(userCard, [ 'data', 'email' ]), true)
	test.is(_.has(userCard, [ 'data', 'roles' ]), true)
	test.is(_.has(userCard, [ 'data', 'password', 'hash' ]), true)
})

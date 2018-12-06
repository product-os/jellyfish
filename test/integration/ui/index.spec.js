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
const macros = require('./macros')

const WAIT_OPTS = {
	timeout: 180 * 1000
}

const context = {}

// Useful for debugging failed tests
// eslint-disable-next-line
const screenshot = async (test, page) => {
	test.context.screenshots = (test.context.screenshots || 0) + 1
	const dir = '/tmp/test-results/screenshots'
	const file = `${test.title}.${test.context.screenshots}.png`
	const path = `${dir}/${file}`
	await page.screenshot({
		path
	})
	console.log(`Saved screenshot: ${file}`)
}

const users = {
	community: {
		username: `johndoe-${randomstring.generate().toLowerCase()}`,
		email: `johndoe-${randomstring.generate().toLowerCase()}@example.com`,
		password: 'password'
	},
	community2: {
		username: `janedoe-${randomstring.generate().toLowerCase()}`,
		email: `janedoe-${randomstring.generate().toLowerCase()}@example.com`,
		password: 'password'
	},
	admin: {
		username: `team-admin-${randomstring.generate().toLowerCase()}`,
		email: `team-admin-${randomstring.generate().toLowerCase()}@example.com`,
		password: 'password'
	}
}

ava.before(async () => {
	await helpers.browser.beforeEach({
		context
	})
})

ava.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('should let new users signup', async (test) => {
	const {
		page,
		server
	} = context

	await page.goto(`http://localhost:${server.port}`)

	await macros.signupUser(page, users.community)

	test.pass()
})

ava.serial('should let users logout', async (test) => {
	const {
		page
	} = context

	await macros.logout(page)

	test.pass()
})

ava.serial('should let users login', async (test) => {
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

ava.serial('should render a list of views in the sidebar', async (test) => {
	const {
		page
	} = context

	await page.waitForSelector('.home-channel', WAIT_OPTS)

	await page.waitForSelector('.home-channel__item', WAIT_OPTS)

	test.pass()
})

ava.serial('should render the community chat view for newly signed up users', async (test) => {
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

ava.serial('should allow newly signed up users to create new chat threads', async (test) => {
	const {
		page
	} = context

	await page.waitForSelector('.btn--add-thread', WAIT_OPTS)

	await page.click('.btn--add-thread')

	await page.waitForSelector('.column--thread', WAIT_OPTS)

	test.pass()
})

ava.serial('should allow newly signed up users to create chat messages', async (test) => {
	const {
		page
	} = context
	const messageText = `My new message: ${randomstring.generate()}`
	const result = await macros.createChatMessage(page, '.column--thread', messageText)
	test.is(result, messageText)
})

ava.serial('should stop users from seeing messages attached to cards they can\'t view', async (test) => {
	const {
		page
	} = context

	const communityUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})

	const balenaOrgCard = await context.server.jellyfish.getCardBySlug(context.session, 'org-balena', {
		type: 'org'
	})

	// Add the community user to the balena org
	await context.server.jellyfish.insertCard(
		context.session,
		{
			type: 'link',
			name: 'has member',
			slug: `link-${balenaOrgCard.id}--${communityUser.id}`,
			data: {
				from: balenaOrgCard.id,
				to: communityUser.id,
				inverseName: 'is member of'
			}
		}
	)

	await page.reload()
	await macros.waitForThenClickSelector(page, '.home-channel__item--view-scratchpad')
	await page.waitForSelector('.column--view-scratchpad')
	await macros.waitForThenClickSelector(page, '.btn--add-scratchpad-entry')

	await page.waitForSelector('.rendition-form__field--root_name', WAIT_OPTS)
	await macros.setInputValue(
		page,
		'.rendition-form__field--root_name input',
		`Test scratchpad entry ${randomstring.generate()}`
	)

	// Submit the form
	await page.click('.card-create-modal__submit')

	await page.waitForSelector('.column--scratchpad-entry')

	const messageText = `My new message: ${randomstring.generate()}`

	await macros.createChatMessage(page, '.column--scratchpad-entry', messageText)

	await macros.logout(page)

	await macros.signupUser(page, users.community2)
	await page.waitForSelector('.column--view-all-messages', WAIT_OPTS)
	await page.waitForSelector('.event-card__message', WAIT_OPTS)
	const lastMessage = await page.evaluate(() => {
		const nodes = document.querySelectorAll('.event-card__message')
		const node = nodes[nodes.length - 1]
		return node.innerText.trim()
	})

	test.not(messageText, lastMessage)
})

ava.serial('should allow team-admin users to update user\'s roles', async (test) => {
	const {
		page
	} = context

	await macros.logout(page)

	const teamAdminUser = await page.evaluate((admin) => {
		return window.sdk.auth.signup(admin)
	}, users.admin)

	// Give the new user the team-admin role
	const teamAdminUserCard = await context.server.jellyfish.getCardById(context.session, teamAdminUser.id, {
		type: 'user'
	})
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

	const balenaOrgCard = await context.server.jellyfish.getCardBySlug(context.session, 'org-balena', {
		type: 'org'
	})

	// Add the admin user to the balena org
	await context.server.jellyfish.insertCard(
		context.session,
		{
			type: 'link',
			slug: `link-${balenaOrgCard.id}--${teamAdminUserCard.id}`,
			name: 'has member',
			data: {
				from: balenaOrgCard.id,
				to: teamAdminUserCard.id,
				inverseName: 'is member of'
			}
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
	await macros.setInputValue(page, '.column--view-all-users input', users.community.username)
	await Bluebird.delay(1000)

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
	await page.waitForSelector('.rendition-form__field--root_data_roles .rendition-form-array-item__add-item', WAIT_OPTS)
	await Bluebird.delay(200)
	await page.click('.rendition-form__field--root_data_roles .rendition-form-array-item__add-item')

	await page.waitForSelector('#root_data_roles_1', WAIT_OPTS)

	// Enter the 'user-team' role as a new role
	// Using page.type to change this input field regularly cuases characters to
	// be "dropped" - the workaround here is to use a script to set the value of
	// the input, and then trigger a change event that React can respond to
	await macros.setInputValue(page, '#root_data_roles_1', 'user-team')

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

ava.serial('After updating a user\'s roles, the other user fields should remain intact', async (test) => {
	// Retrieve the user card
	const userCard = await context.server.jellyfish.getCardBySlug(context.session, `user-${users.community.username}`, {
		type: 'user'
	})

	test.is(_.has(userCard, [ 'data', 'email' ]), true)
	test.is(_.has(userCard, [ 'data', 'roles' ]), true)
	test.is(_.has(userCard, [ 'data', 'password', 'hash' ]), true)
})

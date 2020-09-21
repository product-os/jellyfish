/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const bluebird = require('bluebird')
const _ = require('lodash')
const {
	v4: uuid
} = require('uuid')
const environment = require('@balena/jellyfish-environment')
const helpers = require('./helpers')
const macros = require('./macros')

const WAIT_OPTS = {
	timeout: 180 * 1000
}

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	},
	community2: {
		username: `janedoe-${uuid()}`,
		email: `janedoe-${uuid()}@example.com`,
		password: 'password'
	},
	admin: {
		username: `team-admin-${uuid()}`,
		email: `team-admin-${uuid()}@example.com`,
		password: 'password'
	}
}

// If the current user is not the community user, logout, then login as the
// community user.
const ensureCommunityLogin = async (page) => {
	const baseURL = `${environment.ui.host}:${environment.ui.port}`

	if (!page.url().includes(baseURL)) {
		await page.goto(baseURL)
	}

	const currentUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})

	if (currentUser.slug !== `user-${users.community.username}`) {
		await macros.logout(page)
		await macros.loginUser(page, users.community)

		return page.evaluate(() => {
			return window.sdk.auth.whoami()
		})
	}

	return currentUser
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const user = await context.createUser(users.community)
	await context.addUserToBalenaOrg(user.id)
})

ava.serial.afterEach.always(async (test) => {
	await helpers.afterEach({
		context, test
	})
})

ava.serial.after.always(async () => {
	await helpers.after({
		context
	})
	await helpers.browser.afterEach({
		context
	})
})

// Core
// ============================================================================

ava.serial('core: should let users login', async (test) => {
	const {
		page
	} = context

	await macros.loginUser(page, users.community)

	test.pass()
})

ava.serial('core: should stop users from seeing messages attached to cards they can\'t view', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-all-support-issues"]'
	])

	await page.waitForSelector('.column--view-all-support-issues')
	await macros.waitForThenClickSelector(page, '.btn--add-support-issue')

	await page.waitForSelector('.rendition-form__field--root_name', WAIT_OPTS)
	await macros.setInputValue(
		page,
		'.rendition-form__field--root_name input',
		`Test support issue ${uuid()}`
	)

	// Submit the form
	await page.waitForSelector('[data-test="card-creator__submit"]:not([disabled])')
	await page.click('[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--support-issue')

	const messageText = `My new message: ${uuid()}`

	await macros.waitForThenClickSelector(page, '[role="tablist"] button:nth-of-type(2)')
	await macros.createChatMessage(page, '.column--support-issue', messageText)

	// This reload checks that authorisation persists between reloads and tha the
	// app will correctly bootstrap based on the URL
	await page.reload()
	await page.waitForSelector('.column--support-issue')

	// Wait for a small delay then check again, this means the test will fail if
	// there is a render issue in a subcomponent
	await bluebird.delay(500)
	await page.waitForSelector('.column--support-issue')

	await macros.logout(page)

	await context.createUser(users.community2)

	const lastMessage = await page.evaluate((text) => {
		return window.sdk.query({
			type: 'object',
			properties: {
				type: {
					const: 'message@1.0.0',
					type: 'string'
				},
				data: {
					type: 'object',
					properties: {
						payload: {
							type: 'object',
							properties: {
								message: {
									type: 'string',
									pattern: text
								}
							},
							required: [ 'message' ]
						}
					},
					required: [ 'payload' ]
				}
			},
			required: [ 'type', 'data' ]
		})
	}, messageText)

	test.not(messageText, lastMessage)
})

// Card actions
// ============================================================================

// TODO: Re-enable these tests once we are serving the UI
// over HTTPS in Docker Compose, as otherwise Chromium
// disables `navigator.clipboard`
// See https://stackoverflow.com/a/51823007
ava.serial.skip('card actions: should let users copy a working permalink', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const card = await context.sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread@1.0.0'
	})

	await context.page.goto(
		`${environment.ui.host}:${environment.ui.port}/${card.id}`)

	await context.page.waitForSelector('.column--thread')
	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu__permalink"]')

	const permalink = await page.evaluate(() => {
		return window.navigator.clipboard.readText()
	})

	await page.goto(permalink)
	await page.reload()
	await context.page.waitForSelector('.column--thread')

	test.pass()
})

// TODO: Re-enable these tests once we are serving the UI
// over HTTPS in Docker Compose, as otherwise Chromium
// disables `navigator.clipboard`
// See https://stackoverflow.com/a/51823007
ava.serial.skip('card actions: should let users copy a card as JSON', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const card = await context.sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread@1.0.0'
	})

	await context.page.goto(
		`${environment.ui.host}:${environment.ui.port}/${card.id}`)

	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu__json"]')

	const copiedJSON = await page.evaluate(() => {
		return window.navigator.clipboard.readText()
	})

	test.deepEqual(
		_.omit(card, [ 'links' ]),
		_.omit(JSON.parse(copiedJSON), [ 'links' ]))
})

// TODO: Re-enable these tests once we are serving the UI
// over HTTPS in Docker Compose, as otherwise Chromium
// disables `navigator.clipboard`
// See https://stackoverflow.com/a/51823007
ava.serial.skip('card actions: should let users delete a card', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const card = await context.sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread@1.0.0'
	})

	await context.page.goto(
		`${environment.ui.host}:${environment.ui.port}/${card.id}`)

	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu__delete"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-delete__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')

	test.pass()
})

ava.serial('card actions: should let users add a custom field to a card', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const fieldName = 'test'
	const fieldValue = 'lorem ipsom dolor sit amet'

	const card = await context.sdk.card.create({
		slug: `thread-${uuid()}`,
		type: 'thread@1.0.0'
	})

	await context.page.goto(
		`${environment.ui.host}:${environment.ui.port}/${card.id}`)

	// Edit the card
	await macros.waitForThenClickSelector(page, '.card-actions__btn--edit')

	// Add a new custom field called "test"
	await page.waitForSelector('[data-test="card-edit__free-field-name-input"]')
	await macros.setInputValue(page, '[data-test="card-edit__free-field-name-input"]', fieldName)
	await macros.waitForThenClickSelector(page, '[data-test="card-edit__add-free-field"]')

	// Input a value to the new field and save the changes
	await page.waitForSelector('#root_test')
	await macros.setInputValue(page, '#root_test', fieldValue)
	await macros.waitForThenClickSelector(page, '[data-test="card-edit__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')

	// Check that the card now has the expected value
	const updatedCard = await context.sdk.card.get(card.id)

	test.is(updatedCard.data[fieldName], fieldValue)
})

// Lenses
// =============================================================================

ava.serial('lens: A lens selection should be remembered', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-all-support-threads"]'
	])

	await page.waitForSelector('.column--view-all-support-threads')

	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-support-threads"]')

	await bluebird.delay(2000)

	await page.waitForSelector('[data-test="lens--lens-support-threads"]')

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-issues"]')
	await page.waitForSelector('.column--view-all-support-issues')

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-threads"]')
	await page.waitForSelector('.column--view-all-support-threads')

	// Wait for a while as reload can take some time
	await page.waitForSelector('[data-test="lens--lens-support-threads"]')

	test.pass()
})

// User Status
// =============================================================================
ava.serial('user status: You should be able to enable and disable Do Not Disturb', async (test) => {
	const {
		page
	} = context
	const dndButtonSelector = '[data-test="button-dnd"]'

	await ensureCommunityLogin(page)

	const verifyDndState = async (expectedOn) => {
		// Open the user menu
		await macros.waitForThenClickSelector(page, '.user-menu-toggle')

		await page.waitForSelector(dndButtonSelector)

		// A 'check' icon implies 'Do Not Disturb' is ON
		const checkIcon = await page.$(`${dndButtonSelector} i`)
		test.is(Boolean(checkIcon), expectedOn)

		// The user's avatar should also have a status icon if 'Do Not Disturb' is ON
		const statusIcon = await page.$('.user-menu-toggle .user-status-icon i')
		test.is(Boolean(statusIcon), expectedOn)
	}

	const toggleDnd = async () => {
		await macros.waitForThenClickSelector(page, dndButtonSelector)
		await macros.waitForThenDismissAlert(page, 'Success!')
	}

	await verifyDndState(false)
	await toggleDnd()
	await verifyDndState(true)
	await toggleDnd()
	await verifyDndState(false)

	test.pass()
})

// User Profile
// =============================================================================

ava.serial('user profile: The send command should default to "shift+enter"', async (test) => {
	const {
		page
	} = context

	const user = await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${user.id}/${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > button[role="menuitem"]:nth-of-type(1)')

	await page.waitForSelector('[data-test="lens-my-user__send-command-select"][value="shift+enter"]')

	const value = await macros.getElementValue(page, '[data-test="lens-my-user__send-command-select"]')
	test.is(value, 'shift+enter')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await bluebird.delay(500)
	await page.keyboard.down('Shift')
	await page.keyboard.press('Enter')
	await page.keyboard.up('Shift')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')

	test.pass()
})

ava.serial('user profile: You should be able to change the send command to "enter"', async (test) => {
	const {
		page
	} = context

	const user = await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${user.id}/${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')
	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > button[role="menuitem"]:nth-of-type(3)')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')

	await page.waitForSelector('[data-test="lens-my-user__send-command-select"][value="enter"]')

	const value = await macros.getElementValue(page, '[data-test="lens-my-user__send-command-select"]')
	test.is(value, 'enter')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await bluebird.delay(500)
	await page.keyboard.press('Enter')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')

	test.pass()
})

ava.serial('user profile: You should be able to change the send command to "ctrl+enter"', async (test) => {
	const {
		page
	} = context

	const user = await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${user.id}/${thread.id}`)

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > button[role="menuitem"]:nth-of-type(2)')

	await page.waitForSelector('[data-test="lens-my-user__send-command-select"][value="ctrl+enter"]')

	const value = await macros.getElementValue(page, '[data-test="lens-my-user__send-command-select"]')
	test.is(value, 'ctrl+enter')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')

	// Unfortunately puppeteer Control+Enter doesn't seem to work at all
	// TODO: Fix this test so it works
	/*
	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await page.keyboard.down('ControlLeft')
	await page.keyboard.press('Enter')
	await page.keyboard.up('ControlLeft')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')
	*/

	test.pass()
})

// Views
// =============================================================================

ava.serial.skip('views: Should be able to save a new view', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const name = `test-view-${uuid()}`

	// Navigate to the all messages view
	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-all-messages`)

	await page.waitForSelector('.column--view-all-messages')

	await macros.waitForThenClickSelector(page, '[data-test="filters__add-filter"]')

	await page.waitForSelector('[data-test="filters__filter-edit-form"] input')

	await macros.setInputValue(page, '[data-test="filters__filter-edit-form"] input', 'foobar')
	await macros.waitForThenClickSelector(page, '[data-test="filters__save-filter"]')
	await macros.waitForThenClickSelector(page, '[data-test="filters__open-save-view-modal"]')
	await macros.setInputValue(page, '[data-test="filters__save-view-name"]', name)
	await macros.waitForThenClickSelector(page, '[data-test="filters__save-view"]')

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--__myViews"]')
	await macros.waitForThenClickSelector(page, `[data-test*="${name}"]`)

	test.pass()
})

// Workflows
// =============================================================================

ava.serial('workflows: Should be able to create a new workflow', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Navigate to the workflows view
	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-workflows`)

	await macros.waitForThenClickSelector(page, '.btn--add-workflow')

	const name = `test-workflow-${uuid()}`

	await page.waitForSelector('#root_name')
	await macros.setInputValue(
		page,
		'#root_name',
		name
	)

	await page.type('.monaco-editor textarea', 'sequenceDiagram\nactor1->>actor2: hello!')

	// Wait a small time to allow for form update debouncing
	await require('bluebird').delay(2000)

	await page.click('[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--workflow')

	// Check that a mermaid SVG has been rendered
	await page.waitForSelector('svg[id^="rendition-mermaid"]')

	test.pass()
})

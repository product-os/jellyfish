/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const bluebird = require('bluebird')
const _ = require('lodash')
const path = require('path')
const uuid = require('uuid/v4')
const environment = require('../../../lib/environment')
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

ava.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const user = await context.createUser(users.community)
	await context.addUserToBalenaOrg(user.id)
})

ava.after(async () => {
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

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--Support"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-issues"]')
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
					const: 'message',
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
		type: 'thread'
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
		type: 'thread'
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
		type: 'thread'
	})

	await context.page.goto(
		`${environment.ui.host}:${environment.ui.port}/${card.id}`)

	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu__delete"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-delete__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

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
		type: 'thread'
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
	await page.waitForSelector('[data-test="alert--success"]')

	// Check that the card now has the expected value
	const updatedCard = await context.sdk.card.get(card.id)

	test.is(updatedCard.data[fieldName], fieldValue)
})

// File upload
// =============================================================================

ava.serial('files upload: Users should be able to upload an image', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector(`.column--slug-${thread.slug}`)

	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.png'))

	await page.waitForSelector('.column--thread [data-test="event-card__image"]')

	test.pass()
})

ava.serial('file upload: Users should be able to upload an image to a support thread', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const selector = '.column--support-thread'

	await page.waitForSelector(selector)
	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.png'))

	await page.waitForSelector(`${selector} [data-test="event-card__image"]`)

	test.pass()
})

ava.serial('file upload: Users should be able to upload a text file', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector(`.column--slug-${thread.slug}`)

	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.txt'))

	await page.waitForSelector('.column--thread [data-test="event-card__file"]')

	test.pass()
})

ava.serial('file upload: Users should be able to upload a text file to a support thread', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const selector = '.column--support-thread'

	await page.waitForSelector(selector)
	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.txt'))

	await page.waitForSelector(`${selector} [data-test="event-card__file"]`)

	test.pass()
})

// Lenses
// =============================================================================

ava.serial('lens: A lens selection should be remembered', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--Support"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-threads"]')

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
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${user.id}/${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > div:nth-of-type(1) > button[role="menuitem"]')

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
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${user.id}/${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')
	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > div:nth-of-type(3) > button[role="menuitem"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

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
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${user.id}/${thread.id}`)

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > div:nth-of-type(2) > button[role="menuitem"]')

	await page.waitForSelector('[data-test="lens-my-user__send-command-select"][value="ctrl+enter"]')

	const value = await macros.getElementValue(page, '[data-test="lens-my-user__send-command-select"]')
	test.is(value, 'ctrl+enter')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

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

ava.serial('views: Should be able to save a new view', async (test) => {
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

// Sales
// =============================================================================

ava.serial('should let users create new accounts', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-all-customers`)

	await macros.waitForThenClickSelector(page, '.btn--add-account')

	const name = `test account ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await bluebird.delay(1000)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--account')

	test.pass()
})

ava.serial('should let users create new contacts attached to accounts', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const account = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'account',
			name: 'test account'
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${account.id}`)

	await page.waitForSelector('.column--account')

	await macros.waitForThenClickSelector(page, '[role="tablist"] button:nth-of-type(4)')
	await macros.waitForThenClickSelector(page, '[data-test="add-contact"]')

	const name = `test contact ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await bluebird.delay(1000)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	const results = await page.evaluate((nameParam) => {
		return window.sdk.query({
			$$links: {
				'is member of account': {
					type: 'object'
				}
			},
			type: 'object',
			properties: {
				type: {
					enum: [ 'contact', 'contact@1.0.0' ]
				},
				links: {
					type: 'object'
				},
				name: {
					const: nameParam
				}
			}
		}, {
			limit: 1
		})
	}, name)

	test.is(results[0].links['is member of account'].length, 1)
})

ava.serial('should let users create new contacts', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-all-contacts`)

	await macros.waitForThenClickSelector(page, '.btn--add-contact')

	const name = `test contact ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await bluebird.delay(1000)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--contact')

	test.pass()
})

// Support
// =============================================================================

ava.serial('Updates to support threads should be reflected in the support thread list', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-all-support-threads`)

	await page.waitForSelector('.column--view-all-support-threads')

	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-support-threads"]')

	// Create a new support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Wait for the new support thread to appear in view
	const summarySelector = `[data-test-component="card-chat-summary"][data-test-id="${supportThread.id}"]`
	await macros.waitForThenClickSelector(page, summarySelector)

	await macros.waitForThenClickSelector(page, '.rta__textarea')

	const rand = uuid()

	const columnSelector = '.column--support-thread'
	await macros.createChatMessage(page, columnSelector, `%${rand}`)

	const messageSelector = `${summarySelector} [data-test="card-chat-summary__message"]`

	const messageText = await macros.getElementText(page, messageSelector)

	test.is(rand, messageText)
})

ava.serial('You should be able to link support threads to existing support issues', async (test) => {
	const {
		page
	} = context
	const name = `test-support-issue-${uuid()}`

	await ensureCommunityLogin(page)

	const supportIssue = await page.evaluate((cardName) => {
		return window.sdk.card.create({
			type: 'support-issue',
			name: cardName,
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	}, name)

	// Create a new support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Navigate to the support thread
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	await macros.waitForThenClickSelector(page, '[data-test="card-linker-action"]')

	await macros.waitForThenClickSelector(page, '[data-test="card-linker-action--existing"]')

	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__input"]')

	await page.type('#react-select-2-input', name)

	await page.waitForSelector('#react-select-2-option-0')

	await page.keyboard.press('Enter')

	await page.click('[data-test="card-linker--existing__submit"]')

	await macros.waitForThenClickSelector(page, '[data-test="support-thread__expand"]')

	await page.waitForSelector('[data-test="support-thread__linked-support-issue"]')

	const issueWithLinks = await page.evaluate((card) => {
		return window.sdk.card.getWithLinks(card.id, 'support issue has attached support thread')
	}, supportIssue)

	test.is(
		issueWithLinks.links['support issue has attached support thread'][0].type,
		'support-thread@1.0.0'
	)
})

ava.serial('Support thread timeline should default to sending whispers', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--whisper [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Support thread timeline should send a message if the input is prefixed with a "%" character', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `%${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--message [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Support thread timeline should send a message if the whisper button is toggled', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	await macros.waitForThenClickSelector(page, '[data-test="timeline__whisper-toggle"]')

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--message [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Support thread timeline should revert to "whisper" mode after sending a message', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--whisper [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Users should be able to close a support thread', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	await page.waitForSelector('.column--support-thread')

	await macros.waitForThenClickSelector(page, '[data-test="support-thread__close-thread"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	const thread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)

	test.is(thread.data.status, 'closed')
})

ava.serial('Users should be able to close a support thread by sending a message with #summary', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'

	await page.waitForSelector(columnSelector)

	await macros.createChatMessage(page, columnSelector, '#summary')

	// Wait for the status to change as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="status-closed"]')

	const thread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)

	test.is(thread.data.status, 'closed')
})

// TODO Make this test pass
ava.serial.skip('Users should be able to audit a support thread', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a closed support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'closed'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)
	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)
	await page.waitForSelector('[data-test="audit-panel"]')

	test.pass('A closed support thread should display the audit panel')

	await macros.waitForThenClickSelector(page, '[data-test="create-product-improvement"]')
	await page.waitForSelector('[data-test="create-lens"]')

	const name = 'test product issue'

	await macros.setInputValue(page, '#root_name', name)
	await bluebird.delay(1000)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await bluebird.delay(5000)

	const threadWithIssue = await page.evaluate((id) => {
		return window.sdk.card.getWithLinks(id, 'support thread is attached to product improvement')
	}, supportThread.id)

	const issueFromDB = threadWithIssue.links['support thread is attached to product improvement'][0]

	test.is(issueFromDB.name, name)
	test.is(issueFromDB.type, 'product-improvement', 'Should be able to create a new product improvement')
	test.is(issueFromDB.data.repository, 'balena-io/balena', 'The issue should be created on the balena product repo')

	await macros.waitForThenClickSelector(page, '[data-test="open-agent-feedback-modal"]')

	test.pass('A feedback from should be shown for the support agent')

	const scores = [
		{
			slug: 'empathy',
			value: 1
		},
		{
			slug: 'knowledge',
			value: 0
		},
		{
			slug: 'process',
			value: -1
		},
		{
			slug: 'grammar',
			value: 1
		},
		{
			slug: 'effort',
			value: 1
		}
	]

	// Fill in the feedback from with responses
	for (const score of scores) {
		let identifier = 'positive'
		if (score.value !== 1) {
			identifier = score.value === 0 ? 'neutral' : 'negative'
		}
		await macros.waitForThenClickSelector(page, `[data-test="feedback-form__${score.slug}--${identifier}"]`)
	}

	// Submit the feedback form
	await macros.waitForThenClickSelector(page, '[data-test="feedback-form__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	// Add a small delay to allow for the link creation to occur
	// TODO: Add a "wait" method to the SDK that will resolve once a matching
	// document is found in the database
	await bluebird.delay(8000)

	const threadWithFeedback = await page.evaluate((id) => {
		return window.sdk.card.getWithLinks(id, 'is source for')
	}, supportThread.id)

	const feedbackItemFromDB = threadWithFeedback.links['is source for'][0]

	test.is(feedbackItemFromDB.type, 'feedback-item', 'Should be able to create a new feedback item')

	for (const score of scores) {
		test.is(
			feedbackItemFromDB.data.feedback[score.slug],
			score.value,
			`Should set the correct feedback value for ${score.slug}`
		)
	}

	await macros.waitForThenClickSelector(page, '[data-test="skip-step"]')

	// Finish auditing
	await macros.waitForThenClickSelector(page, '[data-test="finish-auditing"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')
	await bluebird.delay(2000)
	const archivedThread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)

	test.is(archivedThread.data.status, 'archived', 'Should be able to archive the thread once auditing is complete')
})

ava.serial('Support threads should close correctly in the UI even when being updated at a high frequency', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create an open support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			name: 'test thread',
			data: {
				status: 'open'
			}
		})
	})

	await page.goto(
		`${environment.ui.host}:${environment.ui.port}/view-all-support-threads...properties.data.properties.status+is+open`
	)
	await page.waitForSelector('[data-test="lens--lens-support-threads"]')

	const summarySelector = `[data-test-component="card-chat-summary"][data-test-id="${supportThread.id}"]`

	await page.waitForSelector(summarySelector)

	// Generate a large batch of 20 updates to the "name" field, followed by
	// a single update that sets the status to closed.
	// The expected behaviour is that even with the high volume of update to
	// a single card in a short space of time, the UI should eventually set the
	// support thread to closed and stop displaying it. This guards against race
	// conditions where one of the UI operations cause by the update would resolve
	// after the close operation, resulting in the support thread still staying
	// open
	await page.evaluate((id) => {
		const updates = []
		let count = 10
		while (count--) {
			updates.push(window.sdk.card.update(id, 'support-thread', [
				{
					op: 'replace',
					path: '/name',
					value: `foobar ${count}`
				}
			]))
		}

		updates.push(
			window.sdk.card.update(id, 'support-thread', [
				{
					op: 'replace',
					path: '/data/status',
					value: 'closed'
				}
			])
		)

		return window.Promise.all(updates)
	}, supportThread.id)

	await macros.waitForSelectorToDisappear(page, summarySelector)

	test.pass('Support thread closed correctly')
})

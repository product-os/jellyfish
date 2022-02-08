const ava = require('ava')
const bluebird = require('bluebird')
const _ = require('lodash')
const path = require('path')
const {
	v4: uuid
} = require('uuid')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const helpers = require('./helpers')
const macros = require('./macros')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const selectors = {
	chat: {
		message: '[data-test="event-card__message"]',
		search: '.inbox__search input',
		markAsReadButton: '[data-test="inbox__mark-all-as-read"]'
	},
	repo: {
		searchBox: '[data-test="repository__search"] input'
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
const ensureCommunityLogin = async (page, user = users.community) => {
	const baseURL = `${environment.ui.host}:${environment.ui.port}`

	if (!page.url().includes(baseURL)) {
		await page.goto(baseURL)
	}

	const currentUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})

	if (currentUser.slug !== `user-${user.username}`) {
		await macros.logout(page)
		await macros.loginUser(page, user)

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
	const user2 = await context.createUser(users.community2)
	await context.addUserToBalenaOrg(user2.id)
	context.user = user
	context.user2 = user2
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

	await macros.goto(page, `/${card.id}`)

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

	await macros.goto(page, `/${card.id}`)

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

	await macros.goto(page, `/${card.id}`)

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

	await macros.goto(page, `/${card.id}`)

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
		'[data-test="home-channel__item--view-paid-support-threads"]'
	])

	await page.waitForSelector('.column--view-paid-support-threads')

	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-kanban"]')

	await page.waitForSelector('[data-test="lens--lens-kanban"]')

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-forum-threads"]')
	await page.waitForSelector('.column--view-all-forum-threads')

	// Allow some time for the lens selection to be stored
	await bluebird.delay(5000)

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-paid-support-threads"]')
	await page.waitForSelector('.column--view-paid-support-threads')

	await page.waitForSelector('[data-test="lens--lens-kanban"]')

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
	await macros.goto(page, `/${user.id}/${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, 'button#root_profile_sendCommand')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > button[role="menuitem"]:nth-of-type(1)')

	await page.waitForSelector('input#root_profile_sendCommand__input[value="shift+enter"]')

	const value = await macros.getElementValue(page, 'input#root_profile_sendCommand__input')
	test.is(value, 'shift+enter')

	await macros.waitForThenClickSelector(page, 'button[type="submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')

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
	await macros.goto(page, `/${user.id}/${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')
	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, 'button#root_profile_sendCommand')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > button[role="menuitem"]:nth-of-type(3)')

	await page.waitForSelector('input#root_profile_sendCommand__input[value="enter"]')

	const value = await macros.getElementValue(page, 'input#root_profile_sendCommand__input')
	test.is(value, 'enter')

	await macros.waitForThenClickSelector(page, 'button[type="submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await bluebird.delay(500)
	await page.keyboard.press('Enter')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')

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
	await macros.goto(page, '/view-all-messages')

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

ava.serial('views: the filter summary displays the search term correctly', async (test) => {
	const {
		page,
		sdk
	} = context
	const device = `device-${uuid()}`
	const searchTerm = 'test'
	const searchInputSelector = '.view__search input'
	const filterButtonText = `Any field contains ${searchTerm}`
	const clearAllButtonSelector = '//*[@data-test="view__filters-summary-wrapper"]//button[contains(., "Clear all")]'
	const filterButtonSelector = `//*[@data-test="view__filters-summary-wrapper"]//button[contains(., "${filterButtonText}")]`
	const closeFilterButtonSelector = `${filterButtonSelector}/following-sibling::button`
	const scrollableSelector = '.column--view-all-opportunities .ReactVirtualized__Grid.ReactVirtualized__List'

	const account = await sdk.card.create({
		type: 'account@1.0.0',
		name: `account-${uuid()}`,
		data: {
			type: 'Lead'
		}
	})

	const opportunity = await sdk.card.create({
		type: 'opportunity@1.0.0',
		data: {
			device,
			status: 'Created'
		}
	})

	await sdk.card.link(opportunity, account, 'is attached to')

	const opportunityCardSelector = `[data-test-id="snippet-card-${opportunity.id}"]`

	await macros.goto(page, '/view-all-opportunities')
	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-list"]')
	await page.waitForSelector('.view__search')

	// The created opportunity is displayed as we have no active filter
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollable(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// Enter a search term
	await macros.setInputValue(page, searchInputSelector, searchTerm)

	// Check that the search term appears in the filters summary
	await page.waitForXPath(filterButtonSelector)

	// The created opportunity should now be hidden as it doesn't match the search term
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollableToDisappear(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// Click the 'x' button next to the search filter summary item to remove the search filter
	const closeButton = await page.waitForXPath(closeFilterButtonSelector)
	await closeButton.click()

	// The search term has now been cleared from the search input
	let searchText = await macros.getElementText(page, searchInputSelector)
	test.is(searchText.trim(), '')

	// ...and the created opportunity is displayed once again
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollable(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// Enter the search term again
	await macros.setInputValue(page, searchInputSelector, searchTerm)

	// Check that the search term appears in the filters summary again
	await page.waitForXPath(filterButtonSelector)

	// ... and that the created opportunity should be hidden again
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollableToDisappear(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// This time click the 'Clear all' button to remove all filters
	const clearAllButton = await page.waitForXPath(clearAllButtonSelector)
	await clearAllButton.click()

	// The search term has been cleared again from the search input
	searchText = await macros.getElementText(page, searchInputSelector)
	test.is(searchText.trim(), '')

	// ...and the created opportunity is displayed once again
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollable(
		page,
		scrollableSelector,
		opportunityCardSelector
	))
})

// Chat widget
// =============================================================================

ava.serial('chat-widget: A user can start a Jellyfish support thread from the chat widget', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const jfThreadsViewSelector = '.column--view-all-jellyfish-support-threads'
	const jfThreadSelector = '.column--support-thread'
	const cwWrapper = '[data-test="chat-widget"]'
	const cwConvList = '[data-test="initial-short-conversation-page"]'

	const subject = `Subject ${uuid()}`
	const message = `Message ${uuid()}`
	const replyMessage = `Reply ${uuid()}`

	// Use the chat widget to start a new conversation
	await macros.waitForThenClickSelector(page, '[data-test="open-chat-widget"]')

	// Wait for the chat widget to open
	await page.waitForSelector('[data-test="chat-widget"]')

	// If there's existing threads we need to click on the 'Start new conversation' button first
	try {
		await macros.waitForThenClickSelector(page, '[data-test="start-new-conversation-button"]', {
			timeout: 10 * 1000
		})
	} catch (err) {
		// We are probably already in 'Create Thread mode' as there are no existing threads
	}

	await macros.setInputValue(page, `${cwWrapper} [data-test="conversation-subject"]`, subject)
	await macros.setInputValue(page, `${cwWrapper} textarea.new-message-input`, message)
	await macros.waitForThenClickSelector(page, `${cwWrapper} [data-test="start-conversation-button"]`)

	// Verify the conversation timeline is displayed in the chat widget
	const threadSelector = '[data-test="chat-page"]'
	const threadElement = await page.waitForSelector(threadSelector)
	const threadId = await macros.getElementAttribute(page, threadElement, 'data-test-id')
	const messageText = await macros.getElementText(page, `${threadSelector} [data-test="event-card__message"] p`)
	test.is(messageText.trim(), message)

	// Return to the conversation list...
	await macros.waitForThenClickSelector(page, '[data-test="navigate-back-button"]')

	// ...and verify the new conversation is also now listed in the conversation list in the chat widget
	let messageSnippet = await macros.getElementText(page,
		`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`)
	test.is(messageSnippet.trim(), message)

	// Now close the chat widget and navigate to the 'Jellyfish threads' support view
	await macros.waitForThenClickSelector(page, '[data-test="chat-widget"] [data-test="close-chat-widget"]')
	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-all-jellyfish-support-threads"]'
	])

	// And verify the new conversation appears in the list of support threads in this view.
	const threadSummarySelector = `${jfThreadsViewSelector} [data-test-id="${threadId}"]`
	const messageSnippetInThread = await macros.getElementText(page,
		`${threadSummarySelector} [data-test="card-chat-summary__message"] p`)
	test.is(messageSnippetInThread.trim(), message)

	// Now open the support thread view and reply
	await macros.waitForThenClickSelector(page, threadSummarySelector)
	await macros.waitForThenClickSelector(page, '[data-test="timeline-tab"]')
	await macros.waitForThenClickSelector(page, '[data-test="timeline__whisper-toggle"]')
	await bluebird.delay(500)
	await macros.createChatMessage(page, jfThreadSelector, replyMessage)

	// And finally verify the reply shows up in the chat widget conversation summary
	await macros.waitForThenClickSelector(page, '[data-test="open-chat-widget"]')
	messageSnippet = await macros.waitForInnerText(
		page,
		`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`,
		replyMessage
	)
})

// File upload
// =============================================================================

ava.serial('file upload: Users should be able to upload an image', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.slug}`)

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
			type: 'support-thread@1.0.0',
			data: {
				status: 'open'
			}
		})
	})

	// Navigate to the user profile page
	await macros.goto(page, `/${thread.id}`)

	const selector = '.column--support-thread'

	await page.waitForSelector(selector)
	await macros.waitForThenClickSelector(page, '[data-test="timeline-tab"]')
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
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await macros.goto(page, `/${thread.id}`)

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
			type: 'support-thread@1.0.0',
			data: {
				status: 'open'
			}
		})
	})

	// Navigate to the user profile page
	await macros.goto(page, `/${thread.id}`)

	const selector = '.column--support-thread'

	await page.waitForSelector(selector)
	await macros.waitForThenClickSelector(page, '[data-test="timeline-tab"]')
	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.txt'))

	await page.waitForSelector(`${selector} [data-test="event-card__file"]`)

	test.pass()
})

// Outreach oauth
// =============================================================================

ava.serial('outreach: Should redirect to correct endpoint', async (test) => {
	const {
		page
	} = context

	const user = await ensureCommunityLogin(page)

	// Navigate to the user profile page
	await macros.goto(page, `/${user.slug}`)

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(4)')

	// Wait for the outreach API redirect to occur before continuing
	let url = ''
	await new Promise((resolve) => {
		const requestListener = (req) => {
			if (
				req.isNavigationRequest() &&
				req.frame() === page.mainFrame() &&
				req.url().includes('https://accounts.outreach.io/oauth/authorize')
			) {
				url = req.url()
				req.abort('aborted')
				page.removeListener('request', requestListener)
				resolve()
			} else {
				req.continue()
			}
		}

		page.on('request', requestListener)

		page.setRequestInterception(true).then(() => {
			macros.waitForThenClickSelector(page, '[data-test="integration-connection--outreach"]')
		})
	})

	await page.setRequestInterception(false)

	test.is(url, `https://accounts.outreach.io/oauth/authorize?response_type=code&client_id=${environment.integration.outreach.appId}&redirect_uri=https%3A%2F%2Fjel.ly.fish%2Foauth%2Foutreach&scope=prospects.all+sequences.all+sequenceStates.all+sequenceSteps.all+sequenceTemplates.all+mailboxes.all+webhooks.all&state=${user.slug}`)
})

// Repository
// =============================================================================

// TODO: Fix or remove this test. Should messages attached to related thread appear in repo's timeline?
ava.serial.skip('repository: Messages can be filtered by searching for them', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const repoName = `repository-${uuid()}`
	const repoData = {
		type: 'repository@1.0.0',
		slug: repoName,
		name: repoName,
		data: {
			name: repoName
		}
	}
	const repo = await page.evaluate((repository) => {
		return window.sdk.card.create(repository)
	}, repoData)

	const addThreadToRepo = async (targetRepo) => {
		const threadData = {
			type: 'thread',
			slug: `thread-${uuid()}`,
			data: {}
		}
		const repoThread = await page.evaluate(async (card) => {
			const threadDetails = await window.sdk.card.create(card)
			return window.sdk.card.get(threadDetails.id)
		}, threadData)
		await page.evaluate((thread, repository) => {
			return window.sdk.card.link(thread, repository, 'is of')
		}, repoThread, targetRepo)
		return repoThread
	}

	const addMessageToThread = async (thread, message) => {
		const msgData = {
			type: 'message',
			target: thread,
			slug: `message-${uuid()}`,
			payload: {
				message
			}
		}

		return page.evaluate((event) => {
			return window.sdk.event.create(event)
		}, msgData)
	}

	// Create a thread and add two messages to them
	const thread1 = await addThreadToRepo(repo)
	const msg1 = await addMessageToThread(thread1, 'First message')
	const msg2 = await addMessageToThread(thread1, 'Second message')

	await macros.goto(page, `/${repo.id}`)
	await macros.waitForThenClickSelector(page, '[data-test="timeline-tab"]')

	// Initially both messages are displayed in the repo list
	await page.waitForSelector(`#event-${msg1.id}`)
	await page.waitForSelector(`#event-${msg2.id}`)

	// Now search for the first message
	await page.type(selectors.repo.searchBox, 'First')

	// The second message should disappear from the results
	await macros.waitForSelectorToDisappear(page, `#event-${msg2.id}`)

	// Now clear the search input
	await macros.clearInput(page, selectors.repo.searchBox)

	// Both messages should be displayed again
	await page.waitForSelector(`#event-${msg1.id}`)
	await page.waitForSelector(`#event-${msg2.id}`)

	test.pass()
})

// Chat
// =============================================================================

ava.serial('Chat: A notice should be displayed when another user is typing', async (test) => {
	const {
		incognitoPage,
		page
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await macros.goto(incognitoPage, `/${thread.id}`)
	await macros.goto(page, `/${thread.id}`)

	await page.waitForSelector('.column--thread')
	await incognitoPage.waitForSelector('.column--thread')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="typing-notice"]')

	test.is(messageText, `${users.community.username} is typing...`)

	test.pass()
})

ava.serial('Chat: Messages typed but not sent should be preserved when navigating away', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	const thread1 = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	const thread2 = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await macros.goto(page, `/${thread1.id}`)
	await page.waitForSelector(`.column--slug-${thread1.slug}`)

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)

	// The delay here isn't ideal, but it helps mitigate issues that can occur due
	// to the message preservation being debounced in the UI
	await bluebird.delay(5000)

	await macros.goto(page, `/${thread2.id}`)
	await page.waitForSelector(`.column--slug-${thread2.slug}`)

	await macros.goto(page, `/${thread1.id}`)
	await page.waitForSelector(`.column--slug-${thread1.slug}`)

	const messageText = await macros.getElementText(page, 'textarea')

	test.is(messageText, rand)

	test.pass()
})

ava.serial('Chat: Messages that mention a user should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await macros.goto(page, `/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await macros.goto(incognitoPage, '/inbox')

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('Chat: Messages that alert a user should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await macros.goto(page, `/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `!${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await macros.goto(incognitoPage, '/inbox')

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial(
	'Chat: Messages that alert a user should appear in their inbox and in the mentions count',
	async (test) => {
		const {
			user2,
			page,
			incognitoPage
		} = context

		await ensureCommunityLogin(page)
		await ensureCommunityLogin(incognitoPage, users.community2)

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to the thread page
		await macros.goto(page, `/${thread.id}`)

		const columnSelector = `.column--slug-${thread.slug}`
		await page.waitForSelector(columnSelector)

		const msg = `@${user2.slug.slice(5)} ${uuid()}`

		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await macros.goto(incognitoPage, '/inbox')

		await incognitoPage.waitForSelector('[data-test="event-card__message"]')
		const inboxmessages = await incognitoPage.$$('[data-test="event-card__message"]')

		await incognitoPage.waitForSelector('[data-test="homechannel-mentions-count"]')
		const mentionscount = await macros.getElementText(incognitoPage, '[data-test="homechannel-mentions-count"]')

		// Assert that they are equal count
		test.deepEqual(Number(mentionscount), inboxmessages.length)
	})

ava.serial('Chat: Messages that mention a user\'s group should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Create a group and add the user to it
	const groupName = `group-${uuid()}`
	const group = await page.evaluate((name) => {
		return window.sdk.card.create({
			type: 'group@1.0.0',
			name
		})
	}, groupName)

	await page.evaluate((grp, usr) => {
		return window.sdk.card.link(grp, usr, 'has group member')
	}, group, user2)

	// Navigate to the thread page
	await macros.goto(page, `/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@@${groupName} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	// Force reload to fetch group information
	await macros.goto(incognitoPage, '/inbox', {
		forceReload: true
	})
	await macros.waitForInnerText(incognitoPage, '[data-test="event-card__message"]', msg)

	test.pass()
})

ava.serial('Chat: Messages that alert a user\'s group should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Create a group and add the user to it
	const groupName = `group-${uuid()}`
	const group = await page.evaluate((name) => {
		return window.sdk.card.create({
			type: 'group@1.0.0',
			name
		})
	}, groupName)

	await page.evaluate((grp, usr) => {
		return window.sdk.card.link(grp, usr, 'has group member')
	}, group, user2)

	// Navigate to the thread page
	await macros.goto(page, `/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `!!${groupName} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	// Force reload to fetch group information
	await macros.goto(incognitoPage, '/inbox', {
		forceReload: true
	})

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('Chat: One-to-one messages to a user should appear in their inbox', async (test) => {
	const {
		user,
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	const thread = await page.evaluate((u1, u2) => {
		return window.sdk.card.create({
			type: 'thread@1.0.0',
			markers: [ `${u1.slug}+${u2.slug}` ]
		})
	}, user, user2)

	// Navigate to the thread page
	await macros.goto(page, `/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `1-to-1 ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await macros.goto(incognitoPage, '/inbox')

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial(
	'Chat: Only messages that ping a user or one of their groups or their 1-to-1 conversations should appear in their inbox',
	async (test) => {
		const {
			user2,
			page,
			incognitoPage
		} = context

		await ensureCommunityLogin(page)
		await ensureCommunityLogin(incognitoPage, users.community2)

		const userGroups = await page.evaluate((usr) => {
			return window.sdk.query({
				type: 'object',
				required: [ 'type', 'name' ],
				$$links: {
					'has group member': {
						type: 'object',
						required: [ 'slug' ],
						properties: {
							slug: {
								const: usr.slug
							}
						},
						additionalProperties: false
					}
				},
				properties: {
					type: {
						const: 'group@1.0.0'
					}
				}
			})
		}, user2)

		const userGroupNames = _.map(userGroups, 'name')

		// Do things with the SDK to trigger the "status messages"
		// like getting refresh tokens
		await page.evaluate(() => {
			return window.sdk.auth.refreshToken()
		})

		await page.evaluate(() => {
			return window.sdk.auth.refreshToken()
		})

		await page.evaluate(() => {
			return window.sdk.auth.refreshToken()
		})

		// Making a thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Then we send 2 tagged messages to the user
		await macros.goto(page, `/${thread.id}`)

		const columnSelector = `.column--slug-${thread.slug}`
		await page.waitForSelector(columnSelector)

		const msg = `@${user2.slug.slice(5)} ${uuid()}`

		await page.waitForSelector('.new-message-input')

		await macros.createChatMessage(page, columnSelector, msg)

		await macros.createChatMessage(page, columnSelector, msg)

		// And send a message to our own group
		await macros.goto(incognitoPage, `/${thread.id}`)

		await incognitoPage.waitForSelector(columnSelector)

		const ownGroupMsg = `@@${userGroupNames[0]} ${uuid()}`

		await incognitoPage.waitForSelector('.new-message-input')

		await macros.createChatMessage(incognitoPage, columnSelector, ownGroupMsg)

		// Navigate to the inbox page
		await macros.goto(incognitoPage, '/inbox')

		await bluebird.delay(10000)

		// Get all children of the messageList-ListWrapper
		// These should be all messages
		const children = await incognitoPage.$$('[data-test="messageList-event"]')

		const messagesWithUser = []

		// Loop throught all the children to get the labels
		for (const child of children) {
			// Get the labels
			const text = await incognitoPage.evaluate((ele) => {
				return ele.textContent
			}, child)

			const eventId = (await macros.getElementAttribute(incognitoPage, child, 'id')).replace(/^event-/, '')
			console.log('eventId', eventId)
			if (eventId === ownGroupMsg.id) {
				test.fail('Message to own group found in inbox')
			}

			const mentionsGroup = (groupName) => {
				return text.includes(groupName)
			}

			// Check if labels include the @user2
			if (text.includes(user2.slug.slice(5)) || _.some(userGroupNames, mentionsGroup)) {
				// Push all texts to an array
				messagesWithUser.push(true)
			} else {
				// Check if it is a 1-to-1 message that includes user2
				const event = await incognitoPage.evaluate((id) => {
					return window.sdk.card.get(id)
				}, eventId)
				const userInMarkerRegExp = new RegExp(`(\\+|^)${user2.slug}(\\+|$)`)
				if (_.some(_.invokeMap(event.markers, 'match', userInMarkerRegExp))) {
					messagesWithUser.push(true)
				} else {
					messagesWithUser.push(false)
				}
			}
		}

		// Check if array is Expected length
		test.is(messagesWithUser.every((currentValue) => {
			return currentValue === true
		}), true)

		test.pass()
	})

ava.serial.skip('Chat: When having two chats side-by-side both should update with new messages', async (test) => {
	const {
		user,
		page
	} = context

	await ensureCommunityLogin(page)

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	await macros.goto(page, `/${thread.id}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	await page.waitForSelector('.new-message-input')

	const msg = `@${user.slug.slice(5)} ${uuid()}`
	await macros.createChatMessage(page, columnSelector, msg)

	await bluebird.delay(5000)

	const messagesOnPages = await page.$$('.event-card--message')

	test.is(messagesOnPages.length === 2, true)

	test.pass()
})

// TODO re-enable this test once
// https://github.com/product-os/jellyfish/issues/3703 is resolved
ava.skip('Chat: Username pings should be case insensitive', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await macros.goto(page, `/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5).toUpperCase()} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await macros.goto(incognitoPage, '/inbox')

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('Chat: Users should be able to mark all messages as read from their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await macros.goto(page, `/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	await macros.goto(incognitoPage, '/inbox')
	await incognitoPage.waitForSelector(selectors.chat.message)
	await macros.waitForThenClickSelector(incognitoPage, selectors.chat.markAsReadButton)
	await macros.waitForSelectorToDisappear(incognitoPage, selectors.chat.message)

	test.pass()
})

ava.serial('Chat: When filtering unread messages, only filtered messages can be marked as read', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	await ensureCommunityLogin(page)
	await ensureCommunityLogin(incognitoPage, users.community2)

	// Start by marking all messages as read
	await macros.goto(incognitoPage, '/inbox')
	await macros.waitForThenClickSelector(incognitoPage, selectors.chat.markAsReadButton)
	await macros.waitForSelectorToDisappear(incognitoPage, selectors.chat.message)

	// Create three new messages
	const messageDetails = _.range(3).map(() => {
		return {
			mentionsUser: [ user2.slug ],
			slug: `message-${uuid()}`,
			payload: `@${user2.slug.slice(5)} ${uuid()}`
		}
	})

	const messages = await page.evaluate(async (msgs) => {
		const thread = await window.sdk.card.create({
			type: 'thread@1.0.0'
		})
		return Promise.all(msgs.map((msg) => {
			return window.sdk.event.create({
				target: thread,
				slug: msg.slug,
				tags: [],
				type: 'message',
				payload: {
					mentionsUser: msg.mentionsUser,
					message: msg.payload
				}
			})
		}))
	}, messageDetails)

	// Navigate to the inbox page and reload
	await macros.goto(incognitoPage, '/inbox')

	// All three messages should appear in the inbox
	await incognitoPage.waitForSelector(selectors.chat.message)
	let messageElements = await incognitoPage.$$(selectors.chat.message)
	test.is(messageElements.length, 3)
	let markAsReadButtonText = await macros.getElementText(incognitoPage, selectors.chat.markAsReadButton)
	test.is(markAsReadButtonText, 'Mark 3 as read')

	// Now search for the 2nd message
	await macros.setInputValue(incognitoPage, selectors.chat.search, messageDetails[1].payload)

	// Verify only the 2nd message is left in the inbox
	await macros.waitForSelectorToDisappear(incognitoPage, `[id="event-${messages[0].id}]`)
	await macros.waitForSelectorToDisappear(incognitoPage, `[id="event-${messages[2].id}]`)
	messageElements = await incognitoPage.$$(selectors.chat.message)
	test.is(messageElements.length, 1)
	markAsReadButtonText = await macros.getElementText(incognitoPage, selectors.chat.markAsReadButton)
	test.is(markAsReadButtonText, 'Mark 1 as read')

	// Mark just the filtered message as read
	await macros.waitForThenClickSelector(incognitoPage, selectors.chat.markAsReadButton)

	// The filtered message should disappear from the unread inbox
	await macros.waitForSelectorToDisappear(incognitoPage, `[id="event-${messages[1].id}]`)

	// Reload the page
	await macros.goto(incognitoPage, '/inbox', {
		forceReload: true
	})

	// And wait for the other two messages to re-appear (still unread)
	await incognitoPage.waitForSelector(`[id="event-${messages[0].id}"]`)
	await incognitoPage.waitForSelector(`[id="event-${messages[2].id}"]`)
})

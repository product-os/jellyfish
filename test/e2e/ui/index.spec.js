const environment = require('@balena/jellyfish-environment').defaultEnvironment
const {
	test, expect
} = require('@playwright/test')
const assert = require('assert').strict
const _ = require('lodash')
const path = require('path')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

let sdk = {}
let user = {}
let user2 = {}

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

const login = async (page, details) => {
	await page.goto('/')
	await page.type('.login-page__input--username', details.username)
	await page.type('.login-page__input--password', details.password)
	await page.click('.login-page__submit--login')
	await page.waitForSelector('.home-channel')
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	user = await helpers.createUser(sdk, users.community)
	await helpers.addUserToBalenaOrg(sdk, user.id)
	user2 = await helpers.createUser(sdk, users.community2)
	await helpers.addUserToBalenaOrg(sdk, user2.id)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test.describe('Core', () => {
	test('Should let users login', async ({
		page
	}) => {
		await login(page, users.community)
	})
})

test.describe('Contract actions', () => {
	test('Should let users copy a working permalink', async ({
		page, browser
	}) => {
		const context = await browser.newContext()

		// https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
		await context.grantPermissions([ 'clipboard-read' ])
		const newpage = await context.newPage()
		await login(newpage, users.community)

		// Create a thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})

		// Go to the thread and copy its permalink
		await newpage.goto(`/${contract.id}`)
		await newpage.waitForSelector('.column--thread')
		await newpage.locator('[data-test="card-action-menu"]').click()
		await newpage.locator('[data-test="card-action-menu__permalink"]').click()

		const permalink = await newpage.evaluate(() => {
			return window.navigator.clipboard.readText()
		})

		context.clearPermissions()

		await newpage.goto(permalink)
		await newpage.reload()
		await newpage.waitForSelector('.column--thread')
		const url = newpage.url()

		// Needs to be proto://jel.{{uuid}}.{{dns_tld}} (sans :UI_PORT)
		expect(url).toEqual(`${environment.oauth.redirectBaseUrl}/${contract.slug}`)

		await newpage.close()
	})

	test('Should let users copy a card as JSON', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		await context.grantPermissions([ 'clipboard-read' ])
		const newpage = await context.newPage()
		await login(newpage, users.community)

		// Create a thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})

		// Go to the thread and copy its JSON
		await newpage.goto(`/${contract.id}`)
		await newpage.locator('[data-test="card-action-menu"]').click()
		await newpage.locator('[data-test="card-action-menu__json"]').click()

		const copiedJSON = await newpage.evaluate(() => {
			return window.navigator.clipboard.readText()
		})

		context.clearPermissions()

		expect(
			_.omit(contract, [ 'links' ]).slug).toEqual(
			_.omit(JSON.parse(copiedJSON), [ 'links' ]).slug)

		await newpage.close()
	})

	test('Should let users delete a card', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})

		// Go to the created thread and delete it
		await page.goto(`/${contract.id}`)
		await page.locator('[data-test="card-action-menu"]').click()
		await page.locator('[data-test="card-action-menu__delete"]').click()
		await page.locator('[data-test="card-delete__submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		const updatedContract = await sdk.card.get(contract.id)
		expect(updatedContract.active).toBeFalsy()
	})

	test('Should let users add a custom field to a card', async ({
		page
	}) => {
		await login(page, users.community)

		const fieldName = 'test'
		const fieldValue = 'lorem ipsom dolor sit amet'

		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})
		await page.goto(`/${contract.id}`)

		// Add a new custom field called "test"
		await page.locator('.card-actions__btn--edit').click()
		await page.waitForSelector('[data-test="card-edit__free-field-name-input"]')
		await macros.setInputValue(page, '[data-test="card-edit__free-field-name-input"]', fieldName)
		await page.locator('[data-test="card-edit__add-free-field"]').click()

		// Input a value to the new field and save the changes
		await page.waitForSelector('#root_test')
		await macros.setInputValue(page, '#root_test', fieldValue)
		await page.locator('[data-test="card-edit__submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		// Check that the card now has the expected value
		const updatedCard = await sdk.card.get(contract.id)
		expect(updatedCard.data[fieldName]).toEqual(fieldValue)
	})
})

test.describe('Lens', () => {
	test('A lens selection should be remembered', async ({
		page
	}) => {
		await login(page, users.community)

		await macros.navigateToHomeChannelItem(page, [
			'[data-test="home-channel__group-toggle--org-balena"]',
			'[data-test="home-channel__group-toggle--Support"]',
			'[data-test="home-channel__item--view-paid-support-threads"]'
		])

		await page.waitForSelector('.column--view-paid-support-threads')
		await page.locator('[data-test="lens-selector--lens-kanban"]').click()
		await page.waitForSelector('[data-test="lens--lens-kanban"]')
		await page.locator('[data-test="home-channel__item--view-all-forum-threads"]').click()
		await page.waitForSelector('.column--view-all-forum-threads')

		// Allow some time for the lens selection to be stored
		await new Promise((resolve) => {
			setTimeout(resolve, 5000)
		})

		await page.locator('[data-test="home-channel__item--view-paid-support-threads"]').click()
		await page.waitForSelector('.column--view-paid-support-threads')
		await page.waitForSelector('[data-test="lens--lens-kanban"]')
	})
})

test.describe('User Status', () => {
	test('You should be able to enable and disable Do Not Disturb', async ({
		page
	}) => {
		await login(page, users.community)

		const dndButtonSelector = '[data-test="button-dnd"]'
		const verifyDndState = async (expectedOn) => {
			// Open the user menu
			await page.locator('.user-menu-toggle').click()

			await page.waitForSelector(dndButtonSelector)

			// A 'check' icon implies 'Do Not Disturb' is ON
			const checkIcon = await page.$(`${dndButtonSelector} i`)
			expect(Boolean(checkIcon)).toEqual(expectedOn)

			// The user's avatar should also have a status icon if 'Do Not Disturb' is ON
			const statusIcon = await page.$('.user-menu-toggle .user-status-icon i')
			expect(Boolean(statusIcon)).toEqual(expectedOn)
		}

		const toggleDnd = async () => {
			await page.locator(dndButtonSelector).click()
			await macros.waitForThenDismissAlert(page, 'Success!')
		}

		await verifyDndState(false)
		await toggleDnd()
		await verifyDndState(true)
		await toggleDnd()
		await verifyDndState(false)
	})
})

test.describe('User Profile', () => {
	test('The send command should default to "shift+enter"', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to the user profile page and update settings
		await page.goto(`/${user.id}/${thread.id}`)
		await page.waitForSelector('[data-test="lens--lens-my-user"]')
		await page.locator('[data-test="lens--lens-my-user"] button.card-actions__btn--edit').click()
		await page.waitForSelector('[data-test="lens--edit-my-user"]')
		await page.locator('[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(3)').click()
		await page.locator('button#root_profile_sendCommand').click()
		await page.locator('[role="menubar"] > button[role="menuitem"]:nth-of-type(1)').click()
		await page.waitForSelector('input#root_profile_sendCommand__input[value="shift+enter"]')
		const value = await macros.getElementValue(page, 'input#root_profile_sendCommand__input')
		expect(value).toEqual('shift+enter')
		await page.locator('button[type="submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		// Check that the updated setting is working
		await page.type('textarea', uuid())
		await new Promise((resolve) => {
			setTimeout(resolve, 500)
		})
		await page.keyboard.down('Shift')
		await page.keyboard.press('Enter')
		await page.keyboard.up('Shift')
		await page.waitForSelector('.column--thread [data-test="event-card__message"]')
	})

	test('You should be able to change the send command to "enter"', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to the user profile page and update settings
		await page.goto(`/${user.id}/${thread.id}`)
		await page.waitForSelector('[data-test="lens--lens-my-user"]')
		await page.locator('[data-test="lens--lens-my-user"] button.card-actions__btn--edit').click()
		await page.waitForSelector('[data-test="lens--edit-my-user"]')
		await page.locator('[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(3)').click()
		await page.locator('button#root_profile_sendCommand').click()
		await page.locator('[role="menubar"] > button[role="menuitem"]:nth-of-type(3)').click()
		await page.waitForSelector('input#root_profile_sendCommand__input[value="enter"]')
		const value = await macros.getElementValue(page, 'input#root_profile_sendCommand__input')
		expect(value).toEqual('enter')
		await page.locator('button[type="submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		// Check that the updated setting is working
		// Await page.waitForSelector('.new-message-input')
		await page.type('textarea', uuid())
		await new Promise((resolve) => {
			setTimeout(resolve, 500)
		})
		await page.keyboard.press('Enter')
		await page.waitForSelector('.column--thread [data-test="event-card__message"]')
	})
})

test.describe('Views', () => {
	test.skip('Should be able to save a new view', async ({
		page
	}) => {
		await login(page, users.community)
		const name = `test-view-${uuid()}`

		// Navigate to the all messages view
		await page.goto('/view-all-messages')
		await page.waitForSelector('.column--view-all-messages')
		await page.locator('[data-test="filters__add-filter"]').click()
		await page.waitForSelector('[data-test="filters__filter-edit-form"] input')
		await macros.setInputValue(page, '[data-test="filters__filter-edit-form"] input', 'foobar')
		await page.locator('[data-test="filters__save-filter"]').click()
		await page.locator('[data-test="filters__open-save-view-modal"]').click()
		await macros.setInputValue(page, '[data-test="filters__save-view-name"]', name)
		await page.locator('[data-test="filters__save-view"]').click()
		await page.locator('[data-test="home-channel__group-toggle--__myViews"]').click()
		await page.locator(`[data-test*="${name}"]`).click()
	})
})

test.describe('Chat Widget', () => {
	test('A user can start a Jellyfish support thread from the chat widget', async ({
		page
	}) => {
		await login(page, users.community)

		const jfThreadsViewSelector = '.column--view-all-jellyfish-support-threads'
		const jfThreadSelector = '.column--support-thread'
		const cwWrapper = '[data-test="chat-widget"]'
		const cwConvList = '[data-test="initial-short-conversation-page"]'

		const subject = `Subject ${uuid()}`
		const message = `Message ${uuid()}`
		const replyMessage = `Reply ${uuid()}`

		// Chat widget is hidden by default
		await page.waitForSelector(`${cwWrapper}[data-visible="false"]`, {
			state: 'hidden'
		})

		// Open the chat widget
		await page.locator('[data-test="open-chat-widget"]').click()

		// Get visible livechat iframe
		const frameSrc = `${environment.livechat.host}/livechat`
		const frame = await (await page.waitForSelector(`${cwWrapper}[data-visible="true"] iframe[src^="${frameSrc}"]`))
			.contentFrame()

		// Wait for the chat widget to load
		await frame.locator('[data-test="start-new-conversation-button"], [data-test="start-conversation-button"]').click()
		await macros.setInputValue(frame, '[data-test="conversation-subject"]', subject)
		await macros.setInputValue(frame, 'textarea.new-message-input', message)
		await frame.locator('[data-test="start-conversation-button"]').click()

		// Verify the conversation timeline is displayed in the chat widget
		const threadSelector = '[data-test="chat-page"]'
		const threadElement = await frame.waitForSelector(threadSelector)
		const threadId = await macros.getElementAttribute(frame, threadElement, 'data-test-id')
		const messageText = await macros.getElementText(frame, `${threadSelector} [data-test="event-card__message"] p`)
		expect(messageText.trim(), message)

		// Return to the conversation list...
		await frame.locator('[data-test="navigate-back-button"]').click()

		// ...and verify the new conversation is also now listed in the conversation list in the chat widget
		const messageSnippet = await macros.getElementText(frame,
			`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`)
		expect(messageSnippet.trim(), message)

		// Now close the chat widget and navigate to the 'Jellyfish threads' support view
		await frame.locator('[data-test="close-chat-widget"]').click()
		await macros.navigateToHomeChannelItem(page, [
			'[data-test="home-channel__group-toggle--org-balena"]',
			'[data-test="home-channel__group-toggle--Support"]',
			'[data-test="home-channel__item--view-all-jellyfish-support-threads"]'
		])

		// And verify the new conversation appears in the list of support threads in this view.
		const threadSummarySelector = `${jfThreadsViewSelector} [data-test-id="${threadId}"]`
		const messageSnippetInThread = await macros.getElementText(page,
			`${threadSummarySelector} [data-test="card-chat-summary__message"] p`)
		expect(messageSnippetInThread.trim(), message)

		// Now open the support thread view and reply
		await page.locator(threadSummarySelector).click()
		await page.locator('[data-test="timeline-tab"]').click()
		await page.locator('[data-test="timeline__whisper-toggle"]').click()

		await new Promise((resolve) => {
			setTimeout(resolve, 500)
		})
		await macros.createChatMessage(page, jfThreadSelector, replyMessage)

		// And finally verify the reply shows up in the chat widget conversation summary
		await page.locator('[data-test="open-chat-widget"]').click()
		await macros.waitForInnerText(
			frame,
			`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`,
			replyMessage
		)
	})
})

test.describe('File Upload', () => {
	test('Users should be able to upload an image', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.slug}`)
		await page.setInputFiles('input[type="file"]', path.join(__dirname, 'assets', 'test.png'))
		await page.waitForSelector('.column--thread [data-test="event-card__image"]')
	})

	test('Users should be able to upload an image to a support thread', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'support-thread@1.0.0',
				data: {
					status: 'open'
				}
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.id}`)
		await page.locator('[data-test="timeline-tab"]').click()
		await page.setInputFiles('input[type="file"]', path.join(__dirname, 'assets', 'test.png'))
		await page.waitForSelector('.column--support-thread [data-test="event-card__image"]')
	})

	test('Users should be able to upload a text file', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.id}`)
		await page.setInputFiles('input[type="file"]', path.join(__dirname, 'assets', 'test.txt'))
		await page.waitForSelector('.column--thread [data-test="event-card__file"]')
	})

	test('Users should be able to upload a text file to a support thread', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'support-thread@1.0.0',
				data: {
					status: 'open'
				}
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.id}`)
		await page.locator('[data-test="timeline-tab"]').click()
		await page.setInputFiles('input[type="file"]', path.join(__dirname, 'assets', 'test.txt'))
		await page.waitForSelector('.column--support-thread [data-test="event-card__file"]')
	})
})

test.describe('Outreach', () => {
	test('Should redirect to correct endpoint', async ({
		page
	}) => {
		await login(page, users.community)

		// Navigate to the user profile page
		await page.goto(`/${user.slug}`)
		await page.locator('[data-test="lens--lens-my-user"] button.card-actions__btn--edit').click()
		await page.locator('[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(4)').click()

		// Wait for the Outreach API redirect to occur
		let url = null
		await page.route('https://api.outreach.io/oauth/authorize**', async (route) => {
			url = new URL(route.request().url())
			route.abort('aborted')
		})

		await page.locator('[data-test="integration-connection--outreach"]').click()
		await new Promise((resolve) => {
			setTimeout(resolve, 1000)
		})

		const redirectUri = `${environment.oauth.redirectBaseUrl}/oauth/outreach`

		expect(url.origin).toBe('https://api.outreach.io')
		expect(url.pathname).toBe('/oauth/authorize')
		expect(Object.fromEntries(url.searchParams)).toEqual({
			response_type: 'code',
			client_id: environment.integration.outreach.appId,
			redirect_uri: redirectUri,
			scope: [
				'mailboxes.all',
				'prospects.all',
				'sequences.all',
				'sequenceStates.all',
				'sequenceSteps.all',
				'sequenceTemplates.all',
				'webhooks.all'
			].join('+'),
			state: user.slug
		})

		await page.unroute('https://api.outreach.io/oauth/authorize**')
	})
})

test.describe('Repository', () => {
	// TODO: Fix or remove this test. Should messages attached to related thread appear in repo's timeline?
	test.skip('Messages can be filtered by searching for them', async ({
		page
	}) => {
		await login(page, users.community)

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
			await page.evaluate((options) => {
				return window.sdk.card.link(options.thread, options.repository, 'is of')
			}, {
				thread: repoThread, repository: targetRepo
			})
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
		await page.locator('[data-test="timeline-tab"]').click()

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
	})
})

test.describe('Chat', () => {
	test('A notice should be displayed when another user is typing', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to the thread page
		await Promise.all([
			page.goto(`/${thread.id}`),
			page2.goto(`/${thread.id}`)
		])

		await page.type('textarea', uuid())
		const messageText = await page2.locator('data-test=typing-notice').textContent()
		expect(messageText).toEqual(`${users.community.username} is typing...`)

		await page2.close()
	})

	test('Messages typed but not sent should be preserved when navigating away', async ({
		page
	}) => {
		await login(page, users.community)

		const [ thread1, thread2 ] = await Promise.all([
			page.evaluate(() => {
				return window.sdk.card.create({
					type: 'thread@1.0.0'
				})
			}),
			page.evaluate(() => {
				return window.sdk.card.create({
					type: 'thread@1.0.0'
				})
			})
		])

		// Navigate to the thread page
		await page.goto(`/${thread1.id}`)
		await page.waitForSelector(`.column--slug-${thread1.slug}`)

		const rand = uuid()

		await page.waitForSelector('.new-message-input')
		await page.type('textarea', rand)

		// The delay here isn't ideal, but it helps mitigate issues that can occur due
		// to the message preservation being debounced in the UI
		await new Promise((resolve) => {
			setTimeout(resolve, 5000)
		})

		await page.goto(`/${thread2.id}`)
		await page.waitForSelector(`.column--slug-${thread2.slug}`)

		await page.goto(`/${thread1.id}`)
		await page.waitForSelector(`.column--slug-${thread1.slug}`)

		const messageText = await macros.getElementText(page, 'textarea')
		expect(messageText).toEqual(rand)
	})

	test('Messages that mention a user should appear in their inbox', async ({
		page, browser
	}) => {
		const newContext = await browser.newContext()
		const page2 = await newContext.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.waitForSelector('.new-message-input')
		const msg = `@${user2.slug.slice(5)} ${uuid()}`
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(page2, '[data-test="event-card__message"]')
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Messages that alert a user should appear in their inbox', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `!${user2.slug.slice(5)} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(page2, '[data-test="event-card__message"]')
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Messages that alert a user should appear in their inbox and in the mentions count', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `@${user2.slug.slice(5)} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		await page2.waitForSelector('[data-test="event-card__message"]')
		const inboxmessages = await page2.$$('[data-test="event-card__message"]')
		await page2.waitForSelector('[data-test="homechannel-mentions-count"]')
		const mentionscount = await macros.getElementText(page2, '[data-test="homechannel-mentions-count"]')

		// Assert that they are equal count
		expect(inboxmessages.length).toEqual(Number(mentionscount))

		await page2.close()
	})

	test('Messages that mention a users group should appear in their inbox', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Create a group and add the user to it
		const groupName = `group-${uuid()}`
		const group = await page.evaluate((name) => {
			return window.sdk.card.create({
				type: 'group@1.0.0',
				name
			})
		}, groupName)
		await page.evaluate((options) => {
			return window.sdk.card.link(options.group, options.user, 'has group member')
		}, {
			group, user: user2
		})

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `@@${groupName} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		await macros.waitForInnerText(page2, '[data-test="event-card__message"]', msg)

		await page2.close()
	})

	test('Messages that alert a users group should appear in their inbox', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

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

		await page.evaluate((options) => {
			return window.sdk.card.link(options.group, options.user, 'has group member')
		}, {
			group, user: user2
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `!!${groupName} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(page2, '[data-test="event-card__message"]')
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('One-to-one messages to a user should appear in their inbox', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate((options) => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
				markers: [ `${options.user1.slug}+${options.user2.slug}` ]
			})
		}, {
			user1: user, user2
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `1-to-1 ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(page2, '[data-test="event-card__message"]')
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Only messages that ping a user, their groups, or their 1-to-1 conversations should appear in their inbox', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

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
		const columnSelector = `.column--slug-${thread.slug}`

		// Then we send 2 tagged messages to the user
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `@${user2.slug.slice(5)} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)
		await macros.createChatMessage(page, columnSelector, msg)

		// And send a message to our own group
		await page2.goto(`/${thread.id}`)
		await page2.waitForSelector(columnSelector)
		const ownGroupMsg = `@@${userGroupNames[0]} ${uuid()}`
		await page2.waitForSelector('.new-message-input')
		await macros.createChatMessage(page2, columnSelector, ownGroupMsg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		await new Promise((resolve) => {
			setTimeout(resolve, 1000)
		})

		// Get all children of the messageList-ListWrapper
		// These should be all messages
		const children = await page2.$$('[data-test="messageList-event"]')

		// Loop throught all the children to get the labels
		const messagesWithUser = []
		for (const child of children) {
			// Get the labels
			const text = await page2.evaluate((ele) => {
				return ele.textContent
			}, child)

			const eventId = (await macros.getElementAttribute(page2, child, 'id')).replace(/^event-/, '')
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
				const event = await page2.evaluate((id) => {
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

		// Check if array is expected length
		expect(messagesWithUser.every((currentValue) => {
			return currentValue === true
		})).toBeTruthy()

		await page2.close()
	})

	test.skip('When having two chats side-by-side both should update with new messages', async ({
		page
	}) => {
		await login(page, users.community)

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		await page.goto(`/${thread.id}/${thread.id}`)
		const columnSelector = `.column--slug-${thread.slug}`
		await page.waitForSelector(columnSelector)
		await page.waitForSelector('.new-message-input')
		const msg = `@${user.slug.slice(5)} ${uuid()}`
		await macros.createChatMessage(page, columnSelector, msg)

		await new Promise((resolve) => {
			setTimeout(resolve, 5000)
		})

		const messagesOnPages = await page.$$('.event-card--message')
		expect(messagesOnPages.length).toEqual(2)
	})

	// TODO re-enable this test once
	// https://github.com/product-os/jellyfish/issues/3703 is resolved
	test.skip('Username pings should be case insensitive', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `@${user2.slug.slice(5).toUpperCase()} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(page2, '[data-test="event-card__message"]')
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Users should be able to mark all messages as read from their inbox', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		const msg = `@${user2.slug.slice(5)} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		await page2.goto('/inbox')
		await page2.waitForSelector(selectors.chat.message)
		await page2.locator(selectors.chat.markAsReadButton).click()
		await macros.waitForSelectorToDisappear(page2, selectors.chat.message)

		await page2.close()
	})

	test('When filtering unread messages, only filtered messages can be marked as read', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		// Start by marking all messages as read
		await page2.goto('/inbox')
		await page2.locator(selectors.chat.markAsReadButton).click()

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
		await page2.goto('/inbox')

		// All three messages should appear in the inbox
		await page2.waitForSelector(selectors.chat.message)
		let messageElements = await page2.$$(selectors.chat.message)
		expect(messageElements.length).toEqual(3)
		let markAsReadButtonText = await macros.getElementText(page2, selectors.chat.markAsReadButton)
		expect(markAsReadButtonText).toEqual('Mark 3 as read')

		// Now search for the 2nd message
		await macros.setInputValue(page2, selectors.chat.search, messageDetails[1].payload)

		// Verify only the 2nd message is left in the inbox
		await macros.retry(10, async () => {
			messageElements = await page2.$$(selectors.chat.message)
			assert(messageElements.length === 1)
		}, 2000)
		await page2.waitForSelector(`[id=event-${messages[1].id}]`)
		markAsReadButtonText = await macros.getElementText(page2, selectors.chat.markAsReadButton)
		expect(markAsReadButtonText).toEqual('Mark 1 as read')

		// Mark just the filtered message as read
		await page2.locator(selectors.chat.markAsReadButton).click()

		// The filtered message should disappear from the unread inbox
		await page2.locator(`[id=event-${messages[1].id}]`).click()

		// Reload the page
		await page2.goto('/inbox')

		// And wait for the other two messages to re-appear (still unread)
		await page2.waitForSelector(`[id="event-${messages[0].id}"]`)
		await page2.waitForSelector(`[id="event-${messages[2].id}"]`)

		await page2.close()
	})
})

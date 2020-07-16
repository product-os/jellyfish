/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const environment = require('@balena/jellyfish-environment')
const helpers = require('./helpers')
const macros = require('./macros')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const selectors = {
	searchBox: '[data-test="repository__search"] input'
}

const user = helpers.generateUserDetails()

const createRepository = async (page) => {
	const repoName = `repository-${uuid()}`
	const repoData = {
		type: 'repository@1.0.0',
		slug: repoName,
		name: repoName,
		data: {
			name: repoName
		}
	}
	return page.evaluate((repository) => {
		return window.sdk.card.create(repository)
	}, repoData)
}

const addThreadToRepo = async (page, repo) => {
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
	}, repoThread, repo)
	return repoThread
}

const addMessageToThread = async (page, thread, message) => {
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

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	// Create user and log in to the web browser client
	context.communityUser = await context.createUser(user)
	await context.addUserToBalenaOrg(context.communityUser.id)
	await macros.loginUser(context.page, user)
	context.repo = await createRepository(context.page)
})

ava.serial.afterEach.always(async (test) => {
	await helpers.afterEach({
		context, test
	})
})

ava.serial.after.always(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('Messages can be filtered by searching for them', async (test) => {
	const {
		repo,
		page
	} = context

	// Create a thread and add two messages to them
	const thread1 = await addThreadToRepo(page, repo)
	const msg1 = await addMessageToThread(page, thread1, 'First message')
	const msg2 = await addMessageToThread(page, thread1, 'Second message')

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${repo.id}`)

	// Initially both messages are displayed in the repo list
	await page.waitForSelector(`#event-${msg1.id}`)
	await page.waitForSelector(`#event-${msg2.id}`)

	// Now search for the first message
	await page.type(selectors.searchBox, 'First')

	// The second message should disappear from the results
	await macros.waitForSelectorToDisappear(page, `#event-${msg2.id}`)

	// Now clear the search input
	await macros.clearInput(page, selectors.searchBox)

	// Both messages should be displayed again
	await page.waitForSelector(`#event-${msg1.id}`)
	await page.waitForSelector(`#event-${msg2.id}`)

	test.pass()
})

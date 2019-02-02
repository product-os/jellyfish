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
const randomstring = require('randomstring')
const helpers = require('./helpers')
const macros = require('./macros')

const WAIT_OPTS = {
	timeout: 180 * 1000
}

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${randomstring.generate(20)}`
	}
}

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

ava.serial('should stop users from seeing messages attached to cards they can\'t view', async (test) => {
	const {
		page
	} = context

	const communityUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})

	const balenaOrgCard = await context.server.jellyfish.getCardBySlug(
		context.context, context.session, 'org-balena', {
			type: 'org'
		})

	// Add the community user to the balena org
	await context.server.jellyfish.insertCard(
		context.context,
		context.session,
		{
			type: 'link',
			name: 'has member',
			slug: `link-${balenaOrgCard.id}--${communityUser.id}`,
			data: {
				from: {
					id: balenaOrgCard.id,
					type: balenaOrgCard.type
				},
				to: {
					id: communityUser.id,
					type: communityUser.type
				},
				inverseName: 'is member of'
			}
		}
	)

	await page.reload()
	await macros.waitForThenClickSelector(page, '.home-channel__group-toggle--org-balena')
	await macros.waitForThenClickSelector(page, '.home-channel__item--view-all-support-issues')
	await page.waitForSelector('.column--view-all-support-issues')
	await macros.waitForThenClickSelector(page, '.btn--add-support-issue')

	await page.waitForSelector('.rendition-form__field--root_name', WAIT_OPTS)
	await macros.setInputValue(
		page,
		'.rendition-form__field--root_name input',
		`Test support issue ${randomstring.generate()}`
	)

	// Submit the form
	await page.click('.card-create-modal__submit')

	await page.waitForSelector('.column--support-issue')

	const messageText = `My new message: ${randomstring.generate()}`

	await macros.createChatMessage(page, '.column--support-issue', messageText)

	await macros.logout(page)

	await macros.signupUser(page, users.community2)
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

	console.log('lastmessage', lastMessage)

	test.not(messageText, lastMessage)
})

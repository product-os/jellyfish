/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const puppeteer = require('puppeteer')
const {
	v4: uuid
} = require('uuid')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const helpers = require('../sdk/helpers')
const screenshot = require('../screenshot')

exports.puppeteerOptions = {
	headless: !environment.flags.visual,
	dumpio: true,
	args: [
		'--window-size=1366,768',

		// Set extra flags so puppeteer runs on docker
		'--no-sandbox',
		'--disable-setuid-sandbox'
	]
}

exports.generateUserDetails = () => {
	return {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	}
}

exports.addPageHandlers = (page, headless = true) => {
	const onError = (prefix) => {
		return (err) => {
			const tempValue = err.toString()
			console.log(`${prefix}: ${tempValue}`)
			console.log(err)
		}
	}
	page.on('pageerror', onError('Page error'))
	page.on('error', onError('Error'))

	// If we are opening the Chrome browser (i.e. not headless)
	// then we capture the browser's JavaScript console output too
	if (!headless) {
		page.on('console', (msg) => {
			for (let index = 0; index < msg.args().length; ++index) {
				console.log(`${msg.args()[index]}`)
			}
		})
	}
}

exports.afterEach = async ({
	context, test
}) => {
	if (!test.passed) {
		await screenshot.take(context, test.title)
	}
}

exports.after = async ({
	context
}) => {
	if (context.screenshots) {
		await screenshot.comment(context.screenshots)
	}
}

exports.browser = {
	beforeEach: async (test) => {
		await helpers.before(test)
		await helpers.beforeEach(test)

		test.context.browser = await puppeteer.launch(exports.puppeteerOptions)
		const browserContext = test.context.browser.defaultBrowserContext()

		// Allow the clipboard API to be accessed so we can easily test
		// copy-to-clipboard functionality
		browserContext.overridePermissions(
			`${environment.ui.host}:${environment.ui.port}`, [ 'clipboard-read' ])
		test.context.page = await test.context.browser.newPage()
		test.context.page.setViewport({
			width: 1366,
			height: 768
		})

		this.addPageHandlers(test.context.page, exports.puppeteerOptions.headless)

		const incognitoContext = await test.context.browser.createIncognitoBrowserContext()
		const incognitoPage = await incognitoContext.newPage()
		incognitoPage.setViewport({
			width: 1366,
			height: 768
		})

		incognitoPage.on('pageerror', function (err) {
			const theTempValue = err.toString()
			console.log(`Page error: ${theTempValue}`)
			console.log(err)
		})

		test.context.incognitoPage = incognitoPage

		test.context.createUser = async (user) => {
			const result = await test.context.sdk.action({
				card: 'user@1.0.0',
				type: 'type@1.0.0',
				action: 'action-create-user@1.0.0',
				arguments: {
					email: user.email,
					username: `user-${user.username}`,
					password: user.password
				}
			})

			return test.context.sdk.card.get(result.id)
		}

		test.context.updateUser = async (userId, patch) => {
			await test.context.sdk.action({
				card: userId,
				type: 'user@1.0.0',
				action: 'action-update-card@1.0.0',
				arguments: {
					reason: 'for testing',
					patch
				}
			})
			return test.context.sdk.card.get(userId)
		}

		test.context.addUserToBalenaOrg = async (userId) => {
			const userCard = await test.context.sdk.card.get(userId)
			const balenaOrgCard = await test.context.sdk.card.get('org-balena')
			await test.context.sdk.card.link(userCard, balenaOrgCard, 'is member of')
		}
	},

	afterEach: async (test) => {
		await test.context.browser.close()
		await helpers.afterEach(test)
		await helpers.after(test)
	}
}

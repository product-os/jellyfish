/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const puppeteer = require('puppeteer')
const environment = require('../../../lib/environment')
const coverage = require('../../../lib/coverage')
const helpers = require('../sdk/helpers')

exports.browser = {
	beforeEach: async (test) => {
		await helpers.before(test)
		await helpers.beforeEach(test)

		const options = {
			headless: !environment.flags.visual,
			args: [
				'--window-size=1366,768',

				// Set extra flags so puppeteer runs on docker
				'--no-sandbox',
				'--disable-setuid-sandbox'
			]
		}

		test.context.browser = await puppeteer.launch(options)
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

		test.context.page.on('pageerror', function (err) {
			const theTempValue = err.toString()
			console.log(`Page error: ${theTempValue}`)
			console.log(err)
		})

		test.context.createUser = async (user) => {
			const result = await test.context.sdk.action({
				card: 'user',
				type: 'type',
				action: 'action-create-user',
				arguments: {
					email: user.email,
					username: `user-${user.username}`,
					password: user.password
				}
			})

			return test.context.sdk.card.get(result.id)
		}

		test.context.addUserToBalenaOrg = async (userId) => {
			const userCard = await test.context.sdk.card.get(userId)
			const balenaOrgCard = await test.context.sdk.card.get('org-balena')
			await test.context.sdk.card.link(userCard, balenaOrgCard, 'is member of')
		}
	},

	afterEach: async (test) => {
		await coverage.puppeteer(test.context.page)
		await test.context.browser.close()
		await helpers.afterEach(test)
		await helpers.after(test)
	}
}

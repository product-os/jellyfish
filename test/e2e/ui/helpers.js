/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const puppeteer = require('puppeteer')
const environment = require('../../../lib/environment')
const helpers = require('../server/helpers')

exports.browser = {
	beforeEach: async (test) => {
		await helpers.server.beforeEach(test)

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
		browserContext.overridePermissions('http://localhost:8000', [ 'clipboard-read' ])
		test.context.page = await test.context.browser.newPage()
		test.context.page.setViewport({
			width: 1366,
			height: 768
		})
	},

	afterEach: async (test) => {
		await test.context.browser.close()
		await helpers.server.afterEach(test)
	}
}

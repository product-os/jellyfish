/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const puppeteer = require('puppeteer')
const environment = require('../../../lib/environment')
const helpers = require('../client-sdk/helpers')
const uiHelpers = require('../ui/helpers')

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
		test.context.page = await test.context.browser.newPage()
		test.context.page.setViewport({
			width: 1366,
			height: 768
		})

		uiHelpers.addPageHandlers(test.context.page, options.headless)
	},

	afterEach: async (test) => {
		await test.context.browser.close()
		await helpers.afterEach(test)
		await helpers.after(test)
	}
}

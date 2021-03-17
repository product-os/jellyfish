/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const puppeteer = require('puppeteer')
const helpers = require('../sdk/helpers')
const uiHelpers = require('../ui/helpers')
const screenshot = require('../screenshot')

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
	before: async (test) => {
		await helpers.before(test)

		test.context.browser = await puppeteer.launch(uiHelpers.puppeteerOptions)
		test.context.page = await test.context.browser.newPage()
		test.context.page.setViewport({
			width: 1366,
			height: 768
		})

		uiHelpers.addPageHandlers(test.context.page, uiHelpers.puppeteerOptions.headless)
	},

	beforeEach: async (test) => {
		await helpers.beforeEach(test)
	},

	afterEach: async (test) => {
		await helpers.afterEach(test)
	},

	after: async (test) => {
		await test.context.browser.close()
		await helpers.after(test)
	}
}

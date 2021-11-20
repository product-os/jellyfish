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
	beforeEach: async (test) => {
		await helpers.before(test)
		await helpers.beforeEach(test)

		test.context.browser = await puppeteer.launch(uiHelpers.puppeteerOptions)
		test.context.page = await test.context.browser.newPage()
		test.context.page.setViewport({
			width: 1366,
			height: 768
		})

		uiHelpers.addPageHandlers(test.context.page, uiHelpers.puppeteerOptions.headless)
	},

	afterEach: async (test) => {
		await test.context.browser.close()
		await helpers.afterEach(test)
		await helpers.after(test)
	}
}

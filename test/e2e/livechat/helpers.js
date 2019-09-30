/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const puppeteer = require('puppeteer')
const _ = require('lodash')
const path = require('path')
const uuid = require('uuid/v4')
const mkdirp = require('mkdirp')
const fs = require('fs')
const environment = require('../../../lib/environment')
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
	},

	afterEach: async (test) => {
		const coverageReport = await test.context.page.evaluate(() => {
			// eslint-disable-next-line no-underscore-dangle
			return window.__coverage__
		})

		if (coverageReport && !_.isEmpty(coverageReport)) {
			const NYC_OUTPUT_BASE = path.resolve(__dirname, '..', '..', '..', '.nyc_output')
			mkdirp.sync(NYC_OUTPUT_BASE)
			const NYC_OUTPUT_DEST = path.resolve(NYC_OUTPUT_BASE, `${uuid()}.json`)
			console.log(`Storing code coverage results at ${NYC_OUTPUT_DEST}`)
			fs.writeFileSync(NYC_OUTPUT_DEST, JSON.stringify(coverageReport), {
				encoding: 'utf8'
			})
		}

		await test.context.browser.close()

		await helpers.afterEach(test)
		await helpers.after(test)
	}
}

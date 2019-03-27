/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const puppeteer = require('puppeteer')
const path = require('path')
const Bluebird = require('bluebird')
const express = require('express')
const http = require('http')
const environment = require('../../../lib/environment')
const helpers = require('../server/helpers')
const ROOT_PATH = path.resolve(__dirname, '..', '..', '..')

exports.browser = {
	beforeEach: async (test) => {
		await helpers.server.beforeEach(test)

		const application = express()
		application.use(express.static(path.resolve(ROOT_PATH, 'dist')))
		test.context.express = http.Server(application)
		await new Bluebird((resolve, reject) => {
			test.context.express.once('error', reject)
			test.context.express.once('listening', resolve)
			test.context.express.listen(environment.ui.port)
		})

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
			`http://localhost:${environment.ui.port}`, [ 'clipboard-read' ])
		test.context.page = await test.context.browser.newPage()
		test.context.page.setViewport({
			width: 1366,
			height: 768
		})
	},

	afterEach: async (test) => {
		await test.context.browser.close()

		await new Bluebird((resolve) => {
			test.context.express.once('close', resolve)
			test.context.express.close()
		})

		await helpers.server.afterEach(test)
	}
}

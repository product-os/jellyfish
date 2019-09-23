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
const Bluebird = require('bluebird')
const express = require('express')
const http = require('http')
const environment = require('../../../lib/environment')
const helpers = require('../sdk/helpers')
const ROOT_PATH = path.resolve(__dirname, '..', '..', '..')

exports.browser = {
	beforeEach: async (test) => {
		await helpers.sdk.before(test)

		const session = await test.context.sdk.auth.login({
			username: environment.test.user.username,
			password: environment.test.user.password
		})

		test.context.token = session.id

		await helpers.sdk.beforeEach(test, test.context.token)

		const distDir = path.resolve(ROOT_PATH, 'dist/ui')

		const application = express()

		// Serve static files from the dist directory
		application.use(express.static(distDir))

		// If a file isn't found, just serve index.html
		application.use((req, res) => {
			return res.sendFile(path.resolve(distDir, 'index.html'))
		})
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

		await new Bluebird((resolve) => {
			test.context.express.once('close', resolve)
			test.context.express.close()
		})

		await helpers.sdk.afterEach(test)
		await helpers.sdk.after(test)
	}
}

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
const puppeteer = require('puppeteer')

const config = {
	JF_TEST_USER: process.env.JF_TEST_USER,
	JF_TEST_PASSWORD: process.env.JF_TEST_PASSWORD,
	JF_URL: process.env.JF_URL
}

for (const key in config) {
	if (!config[key]) {
		throw new Error(`You must provide the ${key} environment variable.`)
	}
}

const context = {}

ava.test.before(async () => {
	context.browser = await puppeteer.launch()
	context.page = await context.browser.newPage()
	await context.page.goto('https://balena-jellyfish.herokuapp.com')
})

ava.test.after(async () => {
	await context.browser.close()
})

ava.test.serial('should let users login', async (test) => {
	const {
		page
	} = context

	await page.type('.login-page__input--username', config.JF_TEST_USER)
	await page.type('.login-page__input--password', config.JF_TEST_PASSWORD)

	await page.click('.login-page__submit--login')

	await page.waitForSelector('.home-channel')

	test.pass()
})

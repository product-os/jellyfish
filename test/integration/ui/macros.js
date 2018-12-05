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

const _ = require('lodash')

exports.WAIT_OPTS = {
	timeout: 60 * 1000
}

exports.signupUser = async (page, user) => {
	await page.waitForSelector('.login-page', exports.WAIT_OPTS)

	await page.click('.login-signup-toggle')

	await page.waitForSelector('.login-page__signup', exports.WAIT_OPTS)

	await page.type('.login-page__input--email', user.email)
	await page.type('.login-page__input--username', user.username)
	await page.type('.login-page__input--password', user.password)
	await page.type('.login-page__input--confirm-password', user.password)

	await page.click('.login-page__submit--signup')

	await page.waitForSelector('.home-channel', exports.WAIT_OPTS)
}

// Using page.type to change this input field regularly cuases characters to
// be "dropped" - the workaround here is to use a script to set the value of
// the input, and then trigger a change event that React can respond to
exports.setInputValue = async (page, selector, value) => {
	return page.evaluate((params) => {
		const input = document.querySelector(params.selector)
		const lastValue = input.value
		input.value = params.value
		const event = new window.Event('input', {
			bubbles: true
		})
		const tracker = _.get(input, [ '_valueTracker' ])
		if (tracker) {
			tracker.setValue(lastValue)
		}
		input.dispatchEvent(event)
	}, {
		selector,
		value
	})
}

exports.logout = async (page) => {
	await page.waitForSelector('.user-menu-toggle', exports.WAIT_OPTS)
	await page.click('.user-menu-toggle')
	await page.waitForSelector('.user-menu', exports.WAIT_OPTS)
	await page.click('.user-menu__logout')
	await page.waitForSelector('.login-page', exports.WAIT_OPTS)
}

exports.waitForThenClickSelector = async (page, selector) => {
	await page.waitForSelector(selector)
	await page.click(selector)
}

exports.createChatMessage = async (page, scopeSelector, messageText) => {
	await page.waitForSelector('.new-message-input', exports.WAIT_OPTS)
	await page.type('textarea', messageText)
	await page.keyboard.press('Enter')
	await page.waitForSelector(`${scopeSelector} .event-card__message`, exports.WAIT_OPTS)
	const result = await page.$eval(`${scopeSelector} .event-card__message`, (node) => {
		// Trim any trailing line feeds
		return node.innerText.trim()
	})

	return result
}

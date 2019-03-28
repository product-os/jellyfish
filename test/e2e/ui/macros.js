/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const environment = require('../../../lib/environment')

exports.WAIT_OPTS = {
	timeout: 60 * 1000
}

exports.retry = async (times, functionToTry) => {
	try {
		return functionToTry()
	} catch (error) {
		if (times) {
			return exports.retry(times - 1, functionToTry)
		}

		throw error
	}
}

exports.makeSelector = (componentName, slug, id) => {
	return _.uniq([
		`[data-test-component="${componentName}"]`,
		slug && `[data-test-slug="${slug}"]`,
		id && `[data-test-id="${id}"]`
	]).join('')
}

exports.loginUser = async (page, user) => {
	await page.goto(`http://localhost:${environment.ui.port}`)

	await page.waitForSelector('.login-page')

	await page.type('.login-page__input--username', user.username)
	await page.type('.login-page__input--password', user.password)

	await page.click('.login-page__submit--login')

	await page.waitForSelector('.home-channel')
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
	await exports.waitForThenClickSelector(page, '.user-menu-toggle')
	await page.waitForSelector('.user-menu', exports.WAIT_OPTS)
	await exports.retry(3, async () => {
		await exports.waitForThenClickSelector(page, '.user-menu__logout')
		await page.waitForSelector('.login-page', {
			timeout: 2 * 1000
		})
	})
}

exports.waitForThenClickSelector = async (page, selector) => {
	await page.waitForSelector(selector)
	await page.click(selector)
}

exports.createChatMessage = async (page, scopeSelector, messageText) => {
	await page.waitForSelector('.new-message-input', exports.WAIT_OPTS)
	await page.type('textarea', messageText)
	await page.keyboard.down('Shift')
	await page.keyboard.press('Enter')
	await page.keyboard.up('Shift')
	await page.waitForSelector(`${scopeSelector} .event-card__message`, exports.WAIT_OPTS)
}

exports.getElementText = async (page, selector) => {
	await page.waitForSelector(selector)
	const element = await page.$(selector)
	const text = await page.evaluate((ele) => {
		return ele.textContent
	}, element)
	return text
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const bluebird = require('bluebird')
const _ = require('lodash')
const environment = require('@balena/jellyfish-environment')
const fs = require('fs')

exports.WAIT_OPTS = {
	timeout: 60 * 1000
}

// Useful for debugging failed tests
exports.screenshot = async (context, title) => {
	const testTitle = title.replace(/^.*\shook\sfor\s/, '')
	context.screenshots = (context.screenshots || 0) + 1

	const dir = './tmp/test-results/screenshots'

	// Make directory before using it
	fs.mkdirSync(dir, {
		recursive: true
	}, (err) => {
		if (err) throw err
	})

	const file = `${testTitle}.${context.screenshots}.png`
	const path = `${dir}/${file}`
	await context.page.screenshot({
		path
	})
}

exports.retry = async (times, functionToTry) => {
	try {
		const result = await functionToTry()
		return result
	} catch (error) {
		if (times) {
			return exports.retry(times - 1, functionToTry)
		}

		throw error
	}
}

exports.getElementValue = async (page, selector) => {
	const element = await page.$(selector)
	const valueHandle = await element.getProperty('value')
	const value = await valueHandle.jsonValue()

	return value
}

exports.loginUser = async (page, user) => {
	await page.goto(`${environment.ui.host}:${environment.ui.port}`)

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
	// First check if the user is already logged out
	try {
		await page.waitForSelector('.login-page', {
			timeout: 500
		})
		return
	} catch (error) {
		await exports.waitForThenClickSelector(page, '.user-menu-toggle')
		await page.waitForSelector('.user-menu', exports.WAIT_OPTS)
		await exports.waitForThenClickSelector(page, '.user-menu__logout')
		await exports.retry(3, async () => {
			await page.waitForSelector('.login-page', {
				timeout: 2 * 1000
			})
		})
	}
}

exports.waitForThenClickSelector = async (page, selector) => {
	await exports.retry(3, async () => {
		await page.waitForSelector(selector)
		await page.click(selector)
	})
}

exports.createChatMessage = async (page, scopeSelector, messageText) => {
	await page.waitForSelector('.new-message-input', exports.WAIT_OPTS)
	await page.type('textarea', messageText)
	await bluebird.delay(500)

	// If the message triggers an autocomplete widget, dismiss it before
	// continuing. If it is not dismissed the autocomplete will swallow the
	// "Enter" keypress and the message won't be sent
	if (await page.$('.rta__autocomplete') !== null) {
		await page.keyboard.press('Escape')
	}

	await page.keyboard.down('Shift')
	await page.keyboard.press('Enter')
	await page.keyboard.up('Shift')

	await page.waitForSelector(`${scopeSelector} [data-test="event-card__message"]`, exports.WAIT_OPTS)
}

exports.getElementText = async (page, selector) => {
	return exports.retry(3, async () => {
		await page.waitForSelector(selector)
		const element = await page.$(selector)
		const text = await page.evaluate((ele) => {
			return ele.textContent
		}, element)
		return text
	})
}

exports.waitForInnerText = async (page, selector, text, index = 0, options = {}) => {
	await page.waitForFunction(
		(sel, txt, ind) => {
			const matches = document.querySelectorAll(sel)
			return matches[ind] && matches[ind].innerText === txt
		},
		options,
		selector, text, index
	)
}

exports.waitForSelectorToDisappear = async (page, selector, retryCount = 30) => {
	return exports.retry(retryCount, async () => {
		try {
			await page.waitForSelector(selector, {
				timeout: 1000
			})
		} catch (error) {
			return true
		}

		await bluebird.delay(1000)

		throw new Error(`Element still exists: ${selector}`)
	})
}

exports.waitForThenDismissAlert = async (page, alertType) => {
	await exports.waitForThenClickSelector(page, `[data-test="alert--${alertType}"] button`)
}

exports.navigateToHomeChannelItem = async (page, menuStack) => {
	while (menuStack.length) {
		const itemSelector = menuStack.shift()
		const menuItem = await page.waitForSelector(itemSelector)
		const isExpanded = await page.evaluate(
			(item) => { return item.getAttribute('data-expanded') },
			menuItem
		)
		if (isExpanded === 'false') {
			// Need to expand this item
			await exports.waitForThenClickSelector(page, itemSelector)
		} else if (menuStack.length === 0) {
			// We've reached the end of the menu stack.
			// Click the final item to navigate to the view
			await exports.waitForThenClickSelector(page, itemSelector)
		}
	}
}

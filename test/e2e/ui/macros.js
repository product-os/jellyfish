const environment = require('@balena/jellyfish-environment').defaultEnvironment
const _ = require('lodash')
const {
	v4: uuid
} = require('uuid')

exports.TIMEOUT = 60 * 1000

exports.WAIT_OPTS = {
	timeout: exports.TIMEOUT
}

exports.retry = async (times, functionToTry, delay = 0) => {
	try {
		const result = await functionToTry()
		return result
	} catch (error) {
		if (times) {
			if (delay > 0) {
				await new Promise((resolve) => {
					setTimeout(resolve, delay)
				})
			}
			return exports.retry(times - 1, functionToTry, delay)
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

exports.getElementAttribute = async (page, element, attributeName) => {
	return page.evaluate(
		({
			item, attr
		}) => { return item.getAttribute(attr) },
		{
			item: element, attr: attributeName
		}
	)
}

// Navigate to a page by manipulating the UIs react router instead of a full page reload
exports.goto = async (page, path, {
	forceReload
} = {}) => {
	const baseURL = `${environment.ui.host}:${environment.ui.port}`
	await exports.retry(5, async () => {
		if (forceReload || !page.url().includes(baseURL)) {
			await page.goto(`${baseURL}${path}`)
		} else {
			await page.evaluate((pathParam) => {
				return window.routerHistory.push(pathParam)
			}, path)
		}
	}, 500)
}

exports.loginUser = async (page, user) => {
	await page.goto('/')
	await page.waitForSelector('.login-page', exports.WAIT_OPTS)
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
		await page.locator('.user-menu-toggle').click()
		await page.waitForSelector('.user-menu', exports.WAIT_OPTS)
		await page.locator('.user-menu__logout').click()
		await exports.retry(3, async () => {
			await page.waitForSelector('.login-page', {
				timeout: 2 * 1000
			})
		})
	}
	await new Promise((resolve) => {
		setTimeout(resolve, 1000)
	})
}

exports.createChatMessage = async (page, scopeSelector, messageText) => {
	await page.waitForSelector('.new-message-input', exports.WAIT_OPTS)
	await page.type('textarea', messageText)
	await new Promise((resolve) => {
		setTimeout(resolve, 500)
	})

	// If the message triggers an autocomplete widget, dismiss it before
	// continuing. If it is not dismissed the autocomplete will swallow the
	// "Enter" keypress and the message won't be sent
	if (await page.$('.rta__autocomplete') !== null) {
		await page.keyboard.press('Escape')
	}

	const sendCommand = await page.evaluate(async () => {
		return document.querySelector('[data-test-send-command]').getAttribute('data-test-send-command')
	})

	if (sendCommand === 'shift+enter') {
		await page.keyboard.down('Shift')
		await page.keyboard.press('Enter')
		await page.keyboard.up('Shift')
	} else {
		await page.keyboard.press('Enter')
	}

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

exports.waitForInnerText = async (page, selector, text, index) => {
	return exports.retry(10, async () => {
		const isMatch = await page.evaluate((options) => {
			const elements = document.querySelectorAll(options.selector)

			return Array.from(elements).some((element, elementIndex) => {
				return element.innerText === options.text &&
					(typeof options.index === 'undefined' || options.index === elementIndex)
			})
		}, {
			selector, text, index
		})

		if (!isMatch) {
			throw new Error(`Text not found: "${text}"`)
		}
	}, 5000)
}

exports.clearInput = async (page, selector) => {
	const input = await page.$(selector)
	await input.click({
		clickCount: 3
	})
	await page.keyboard.press('Backspace')
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

		await new Promise((resolve) => {
			setTimeout(resolve, 1000)
		})

		throw new Error(`Element still exists: ${selector}`)
	})
}

exports.waitForThenDismissAlert = async (page, alertPrefix) => {
	const notificationButtonSelector =
		`//*[contains(@class, "notification-item")][//*[contains(text(), "${alertPrefix}")]]//button`
	await page.locator(notificationButtonSelector).click()

	// Wait for animated notification exit
	await new Promise((resolve) => {
		setTimeout(resolve, 2000)
	})
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
			await page.locator(itemSelector).click()
		} else if (menuStack.length === 0) {
			// We've reached the end of the menu stack.
			// Click the final item to navigate to the view
			await page.locator(itemSelector).click()
		}
	}
}

const lookForElementInsideScrollable = async ({
	elemSelector, selector
}) => {
	const scrollable = document.querySelector(elemSelector)

	if (!scrollable) {
		return {
			result: null,
			success: false
		}
	}

	const stepTimeout = 100
	const stepDistance = scrollable.clientHeight

	scrollable.scroll(0, 0)

	let target = null
	while (true) {
		target = document.querySelector(selector)

		if (target) {
			return {
				result: target,
				success: true
			}
		}

		/* If the container is not scrollable or
		 * if it's scrolled to the end
		 * return undefined
		 */
		if (scrollable.scrollHeight <= scrollable.clientHeight ||
			scrollable.scrollTop === (scrollable.scrollHeight - scrollable.offsetHeight)) {
			return {
				result: null,
				success: false
			}
		}

		await new Promise((resolve) => {
			setTimeout(resolve, stepTimeout)
		})

		scrollable.scroll(0, scrollable.scrollTop + stepDistance)
	}
}

exports.waitForSelectorInsideScrollable = async (page, scrollableSelector, selector) => {
	const start = Date.now()

	while (true) {
		if (Date.now() - start > exports.TIMEOUT) {
			throw new Error('Timeout error')
		}

		const result = await page.evaluateHandle(lookForElementInsideScrollable, {
			elemSelector: scrollableSelector, selector
		})

		if (await (await result.getProperty('success')).jsonValue()) {
			const foo = await result.getProperty('result')
			return foo
		}

		await new Promise((resolve) => {
			setTimeout(resolve, 100)
		})
	}
}

exports.waitForSelectorInsideScrollableToDisappear = async (page, scrollableSelector, selector) => {
	const start = Date.now()

	while (true) {
		if (Date.now() - start > exports.TIMEOUT) {
			throw new Error('Timeout error')
		}

		const result = await page.evaluateHandle(
			lookForElementInsideScrollable,
			{
				elemSelector: scrollableSelector, selector
			}
		)

		if (!(await (await result.getProperty('success')).jsonValue())) {
			return
		}

		await new Promise((resolve) => {
			setTimeout(resolve, 100)
		})
	}
}

exports.mockLoginAs = async (page, baseURL, user) => {
	const oauthUrl = `https://dashboard.balena-cloud.com/login/oauth/${environment.integration['balena-api'].appId}`
	const code = uuid()

	await page.route('**/*', async (route) => {
		const url = new URL(route.request().url())

		if (url.href.startsWith(oauthUrl)) {
			const state = url.searchParams.get('state')

			await route.fulfill({
				status: 301,
				headers: {
					Location: `${baseURL}/oauth/callback?state=${encodeURIComponent(state)}&code=${code}`
				}
			})
		} else if (url.pathname === '/api/v2/oauth/balena-api') {
			const body = route.request().postDataJSON()

			if (body.slug !== user.card.slug || body.code !== code) {
				throw new Error('Invalid parameters')
			}

			await route.fulfill({
				contentType: 'application/json',
				headers: {
					'access-control-allow-origin': '*'
				},
				status: 200,
				body: JSON.stringify({
					error: false,
					data: {
						access_token: user.sdk.getAuthToken()
					}
				})
			})
		} else {
			await route.continue()
		}
	})

	return async () => {
		await page.unroute('**/*')
	}
}

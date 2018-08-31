const Bluebird = require('bluebird')

exports.waitForElement = async (component, selector, timeout = 30 * 1000) => {
	const waitFor = 500
	let totalTime = 0

	while (true) {
		// Due to the way enzyme works we need to synchronously update the component
		// to register changes in redux
		component.update()

		if (component.find(selector).exists()) {
			break
		}

		if (totalTime > timeout) {
			throw new Error(`Could not find selector ${selector} in render tree after ${timeout}ms:\r${component.html()}`)
		}

		await Bluebird.delay(waitFor)

		totalTime += waitFor
	}

	return true
}

exports.waitForThenClickElement = async (component, selector, timeout) => {
	await exports.waitForElement(component, selector, timeout)

	component.find(selector)
		.first()
		.simulate('click')
}

exports.changeInputValue = async (component, selector, value) => {
	component.find(selector)
		.first()
		.simulate('change', {
			target: {
				value
			}
		})

	component.update()
}

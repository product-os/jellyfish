// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	use: {
		headless: true,
		viewport: {
			width: 1366, height: 687
		},
		ignoreHTTPSErrors: true,
		baseURL: 'http://jel.ly.fish.local',
		browserName: 'chromium'
	},
	timeout: 10 * 60 * 1000,
	retries: 2,
	workers: 1
}

module.exports = config

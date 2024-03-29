// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
/* eslint no-process-env: "off" */
const config = {
	use: {
		headless: true,
		viewport: {
			width: 1366,
			height: 687,
		},
		ignoreHTTPSErrors: false,
		baseURL: process.env.UI_HOST || 'http://jel.ly.fish.local',
		browserName: 'chromium',
		launchOptions: {
			args: ['--disable-gpu', '--disable-dev-shm-usage'],
		},
	},
	timeout: 2 * 60 * 1000,
	retries: 2,
	workers: 1,
};

module.exports = config;

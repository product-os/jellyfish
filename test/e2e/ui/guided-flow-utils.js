/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const macros = require('./macros')
const environment = require('../../../lib/environment')

const selectors = {
	nextBtn: '[data-test="steps-flow__next-btn"]',
	actionBtn: '[data-test="steps-flow__action-btn"]'
}

exports.commonSelectors = selectors

exports.nextStep = (page) => {
	return macros.waitForThenClickSelector(page, `${selectors.nextBtn}:not(:disabled)`)
}

exports.action = async (page) => {
	// Click the action button, wait for it to be disabled and then enabled again
	await macros.waitForThenClickSelector(page, `${selectors.actionBtn}:not(:disabled)`)
	await page.waitForSelector(`${selectors.actionBtn}[disabled]`)
	await page.waitForSelector(selectors.actionBtn)
}

exports.createSupportThreadAndNavigate = async (page, owner = null) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})
	if (owner) {
		await page.evaluate((props) => {
			return window.sdk.card.link(props.supportThread, props.owner, 'is owned by')
		}, {
			supportThread, owner
		})
	}
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)
	return supportThread
}

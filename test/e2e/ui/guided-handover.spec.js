/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const macros = require('./macros')
const guidedFlowUtils = require('./guided-flow-utils')

const {
	commonSelectors,
	nextStep,
	action,
	createSupportThreadAndNavigate
} = guidedFlowUtils

const unassignedButtonText = 'Assign to me'

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`,
		reason: 'just because',
		statusDescription: 'solved!'
	}
}

const selectors = {
	threadMoreButton: '[data-test="support-thread-details__header"]',
	rbTeam: 'label[for="rb-ghf-team"]',
	rbUnassign: 'label[for="rb-ghf-unassign"]',
	ddAssignToMe: '[data-test="card-owner-menu__assign-to-me"]',
	ddAssign: '[data-test="card-owner-menu__assign"]',
	ddUnassign: '[data-test="card-owner-menu__unassign"]',
	userError: '[data-test="ghf__user-error"]',
	nextBtn: '[data-test="steps-flow__next-btn"]',
	actionBtn: '[data-test="steps-flow__action-btn"]',
	reasonTextArea: '[data-test="gf__ta-reason"]',
	statusTextTextArea: '[data-test="gf__ta-statusDescription"]',
	whisper: '.event-card--whisper [data-test="event-card__message"]'
}

const user = helpers.generateUserDetails()

const otherUser = helpers.generateUserDetails()

const openCardOwnerDropdown = async (page) => {
	// Slight css selector hack needed to select the toggle button of a Rendition dropdown!
	return macros.waitForThenClickSelector(
		page,
		'[data-test="card-owner-dropdown"] [data-test="card-owner-dropdown"]:nth-child(2)'
	)
}

const verifyCardOwner = async (test, page, isAssigned, expectedOwnerText) => {
	const dataTestAttribute = isAssigned
		? 'card-owner-dropdown__label--assigned'
		: 'card-owner-dropdown__label--assign-to-me'
	const selector = `//*[@data-test="${dataTestAttribute}"][text()="${expectedOwnerText}"]`
	const cardOwner = await page.waitForXPath(selector)
	const text = await page.evaluate((ele) => {
		return ele.textContent
	}, cardOwner)
	test.is(text, expectedOwnerText)
	return cardOwner
}

const getWhisperText = async (page) => {
	const whisperText = await macros.getElementText(page, selectors.whisper)
	return whisperText.trim()
}

const verifyThreadStatus = async (test, page, expectedStatus) => {
	const statusDescription = await macros.getElementText(page, '[data-test="card-field__value--statusdescription"]')
	test.is(statusDescription.trim(), expectedStatus)
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	// Create user and log in to the web browser client
	const communityUser = await context.createUser(user)
	context.otherCommunityUser = await context.createUser(otherUser)
	context.otherCommunityUserSlug = context.otherCommunityUser.slug.replace('user-', '')
	await context.addUserToBalenaOrg(communityUser.id)
	await context.addUserToBalenaOrg(context.otherCommunityUser.id)
	await macros.loginUser(context.page, user)

	context.currentUser = await context.page.evaluate(() => {
		return window.sdk.auth.whoami()
	})
	context.currentUserSlug = context.currentUser.slug.replace('user-', '')
})

ava.serial.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('You can assign an unassigned thread to yourself', async (test) => {
	const {
		page,
		currentUserSlug
	} = context

	// Create a new support thread
	await createSupportThreadAndNavigate(page)
	await macros.waitForThenClickSelector(page, selectors.threadMoreButton)

	// Verify its currently unassigned
	await verifyCardOwner(test, page, false, unassignedButtonText)

	// Assign the thread to ourselves
	await macros.waitForThenClickSelector(page, 'button[data-test="card-owner-dropdown"]:first-child')

	// Verify the new owner is me!
	await verifyCardOwner(test, page, true, currentUserSlug)

	// Check the whisper
	const whisperText = await getWhisperText(page)
	test.is(whisperText, `Assigned to @${currentUserSlug}`)
})

ava.serial('You can assign an unassigned thread to another user', async (test) => {
	const {
		page,
		otherCommunityUser,
		otherCommunityUserSlug
	} = context

	// Create a new support thread
	await createSupportThreadAndNavigate(page)
	await macros.waitForThenClickSelector(page, selectors.threadMoreButton)

	// Verify its currently unassigned
	await verifyCardOwner(test, page, false, unassignedButtonText)

	// Open the Guided Handover Flow
	await openCardOwnerDropdown(page)
	await macros.waitForThenClickSelector(page, selectors.ddAssign)

	// Select the other user
	await macros.waitForThenClickSelector(page, selectors.rbTeam)
	await page.type('.ghf-async-select__input input', otherCommunityUser.slug)
	await page.waitForSelector('.ghf-async-select__option--is-focused')
	await page.keyboard.press('Enter')

	await nextStep(page)

	// Enter a reason
	await page.type(selectors.reasonTextArea, context.context.reason)

	await nextStep(page)

	// Enter the statusDescription
	await page.type(selectors.statusTextTextArea, context.context.statusDescription)

	// Click the action button
	await action(page)

	// Verify the new owner
	await verifyCardOwner(test, page, true, otherCommunityUserSlug)

	// Check the whisper
	const whisperText = await getWhisperText(page)
	test.is(whisperText, `Assigned to @${otherCommunityUserSlug}\n\n${context.context.reason}`)

	await verifyThreadStatus(test, page, context.context.statusDescription)
})

ava.serial('You can unassign a thread that was assigned to you', async (test) => {
	const {
		page,
		currentUser,
		currentUserSlug
	} = context

	// Create a new support thread (assigned to ourselves)
	await createSupportThreadAndNavigate(page, currentUser)
	await macros.waitForThenClickSelector(page, selectors.threadMoreButton)

	// Verify its currently assigned to us
	await verifyCardOwner(test, page, true, currentUserSlug)

	// Open the Guided Handover Flow
	await openCardOwnerDropdown(page)
	await macros.waitForThenClickSelector(page, selectors.ddUnassign)

	// Ensure the 'Unassign' option is selected
	await macros.waitForThenClickSelector(page, selectors.rbUnassign)
	await nextStep(page)

	// Enter a reason
	await page.type(selectors.reasonTextArea, context.context.reason)

	await nextStep(page)

	// Enter the statusDescription
	await page.type(selectors.statusTextTextArea, context.context.statusDescription)

	// Click the action button
	await action(page)

	// Verify its now unassigned
	await verifyCardOwner(test, page, false, unassignedButtonText)

	// Check the whisper
	const whisperText = await getWhisperText(page)
	test.is(whisperText, `Unassigned from @${currentUserSlug}\n\n${context.context.reason}`)

	await verifyThreadStatus(test, page, context.context.statusDescription)
})

ava.serial('You can unassign a thread that was assigned to another user', async (test) => {
	const {
		page,
		otherCommunityUser,
		otherCommunityUserSlug
	} = context

	// Create a new support thread (assigned to the other user)
	await createSupportThreadAndNavigate(page, otherCommunityUser)
	await macros.waitForThenClickSelector(page, selectors.threadMoreButton)

	// Verify its currently assigned to the other user
	await verifyCardOwner(test, page, true, otherCommunityUserSlug)

	// Open the Guided Handover Flow
	await openCardOwnerDropdown(page)
	await macros.waitForThenClickSelector(page, selectors.ddUnassign)

	// Ensure the 'Unassign' option is selected
	await macros.waitForThenClickSelector(page, selectors.rbUnassign)
	await nextStep(page)

	// Enter a reason
	await page.type(selectors.reasonTextArea, context.context.reason)

	await nextStep(page)

	// Enter the statusDescription
	await page.type(selectors.statusTextTextArea, context.context.statusDescription)

	// Click the action button
	await action(page)

	// Verify its now unassigned
	await verifyCardOwner(test, page, false, unassignedButtonText)

	// Check the whisper
	const whisperText = await getWhisperText(page)
	test.is(whisperText, `Unassigned from @${otherCommunityUserSlug}\n\n${context.context.reason}`)

	await verifyThreadStatus(test, page, context.context.statusDescription)
})

ava.serial('You can reassign a thread from yourself to another user', async (test) => {
	const {
		page,
		currentUser,
		currentUserSlug,
		otherCommunityUser,
		otherCommunityUserSlug
	} = context

	// Create a new support thread (assigned to ourselves)
	await createSupportThreadAndNavigate(page, currentUser)
	await macros.waitForThenClickSelector(page, selectors.threadMoreButton)

	// Verify its currently assigned to us
	await verifyCardOwner(test, page, true, currentUserSlug)

	// Open the Guided Handover Flow
	await openCardOwnerDropdown(page)
	await macros.waitForThenClickSelector(page, selectors.ddAssign)

	// Select the other user
	await macros.waitForThenClickSelector(page, selectors.rbTeam)
	await page.type('.ghf-async-select__input input', otherCommunityUser.slug)
	await page.waitForSelector('.ghf-async-select__option--is-focused')
	await page.keyboard.press('Enter')

	await nextStep(page)

	// Enter a reason
	await page.type(selectors.reasonTextArea, context.context.reason)

	await nextStep(page)

	// Enter the statusDescription
	await page.type(selectors.statusTextTextArea, context.context.statusDescription)

	// Click the action button
	await action(page)

	// Verify its now assigned to the other user
	await verifyCardOwner(test, page, true, otherCommunityUserSlug)

	// Check the whisper
	const whisperText = await getWhisperText(page)
	test.is(whisperText, `Reassigned from @${currentUserSlug} to @${otherCommunityUserSlug}\n\n${context.context.reason}`)

	// Verify the thread's status
	await verifyThreadStatus(test, page, context.context.statusDescription)
})

ava.serial('You can reassign a thread from another user to yourself', async (test) => {
	const {
		page,
		currentUserSlug,
		otherCommunityUser,
		otherCommunityUserSlug
	} = context

	// Create a new support thread (assigned to the other user)
	await createSupportThreadAndNavigate(page, otherCommunityUser)

	// Verify its currently assigned to the other user
	await verifyCardOwner(test, page, true, otherCommunityUserSlug)

	// Assign it to ourselves
	await openCardOwnerDropdown(page)
	await macros.waitForThenClickSelector(page, selectors.ddAssignToMe)

	// Verify the new owner is me!
	await verifyCardOwner(test, page, true, currentUserSlug)

	// Check the whisper
	const whisperText = await getWhisperText(page)
	test.is(whisperText, `Reassigned from @${otherCommunityUserSlug} to @${currentUserSlug}`)
})

ava.serial('You cannot assign a thread to its existing owner', async (test) => {
	const {
		page,
		otherCommunityUser,
		otherCommunityUserSlug
	} = context

	// Create a new support thread
	await createSupportThreadAndNavigate(page, otherCommunityUser)

	// Verify its currently assigned to the other user
	await verifyCardOwner(test, page, true, otherCommunityUserSlug)

	// Open the Guided Handover Flow
	await openCardOwnerDropdown(page)
	await macros.waitForThenClickSelector(page, selectors.ddAssign)

	// Select the other user
	await macros.waitForThenClickSelector(page, selectors.rbTeam)
	await page.type('.ghf-async-select__input input', otherCommunityUser.slug)
	await page.waitForSelector('.ghf-async-select__option--is-focused')
	await page.keyboard.press('Enter')

	// Error message should be displayed and 'Next' button should be disabled
	await page.waitForSelector(selectors.userError)
	await page.waitForSelector(`${commonSelectors.nextBtn}[disabled]`)
	test.pass()
})

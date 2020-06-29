/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const handoverUtils = require('./handover-utils')

ava('.generateWhisperMessage() works for unassignment', (test) => {
	const currentOwner = {
		slug: 'user-Test1'
	}
	const newOwner = null
	const reason = 'A reason'
	const currentStatus = 'New status'
	test.is(
		handoverUtils.generateWhisperMessage(currentOwner, newOwner, reason, currentStatus),
		'Unassigned from @Test1\n\n**Reason:**\nA reason\n\n**Current Status:**\nNew status')
})

ava('.generateWhisperMessage() works for assignment', (test) => {
	const currentOwner = null
	const newOwner = {
		slug: 'user-Test2'
	}
	const reason = 'A reason'
	const currentStatus = 'New status'
	test.is(
		handoverUtils.generateWhisperMessage(currentOwner, newOwner, reason, currentStatus),
		'Assigned to @Test2\n\n**Reason:**\nA reason\n\n**Current Status:**\nNew status')
})

ava('.generateWhisperMessage() works for reassignment', (test) => {
	const currentOwner = {
		slug: 'user-Test1'
	}
	const newOwner = {
		slug: 'user-Test2'
	}
	const reason = 'A reason'
	const currentStatus = 'New status'
	test.is(
		handoverUtils.generateWhisperMessage(currentOwner, newOwner, reason, currentStatus),
		'Reassigned from @Test1 to @Test2\n\n**Reason:**\nA reason\n\n**Current Status:**\nNew status')
})

ava('.generateWhisperMessage() does not require a reason', (test) => {
	const currentOwner = null
	const newOwner = {
		slug: 'user-Test2'
	}
	const reason = null
	const currentStatus = 'New status'
	test.is(
		handoverUtils.generateWhisperMessage(currentOwner, newOwner, reason, currentStatus),
		'Assigned to @Test2\n\n**Current Status:**\nNew status')
})

ava('.generateWhisperMessage() does not require a status', (test) => {
	const currentOwner = null
	const newOwner = {
		slug: 'user-Test2'
	}
	const reason = 'A reason'
	test.is(
		handoverUtils.generateWhisperMessage(currentOwner, newOwner, reason),
		'Assigned to @Test2\n\n**Reason:**\nA reason')
})

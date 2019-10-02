/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

exports.createThreads = async (context, start, count) => {
	const threads = []

	for (let index = start; index < start + count; index++) {
		const thread = await context.sdk.card.create({
			type: 'support-thread',
			name: `Thread subject ${index}`
		})

		threads.push(thread)
	}

	return threads
}

exports.getRenderedConversationIds = async (context) => {
	return context.page.evaluate(() => {
		const containers = document.querySelectorAll('[data-test-component="card-chat-summary"]')
		return Array.from(containers).map((container) => {
			return container.getAttribute('data-test-id')
		})
	})
}

exports.scrollToLatestConversationListItem = (context) => {
	return context.page.evaluate(() => {
		const containers = document.querySelectorAll('[data-test-component="card-chat-summary"]')
		containers[containers.length - 1].scrollIntoView()
	})
}

exports.createConversation = async (context) => {
	await context.page.type('[data-test="conversation-subject"]', 'Conversation subject')
	await context.page.type('.new-message-input', 'Conversation first message')
	await context.page.click('[data-test="start-conversation-button"]')
}

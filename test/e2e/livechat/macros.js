/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

exports.createThreads = async (context, start, end) => {
	const threads = []

	for (let index = start; index < end; index++) {
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

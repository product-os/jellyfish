/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* eslint-disable no-underscore-dangle, id-length */

/*
 * This script looks through Front inboxes and deletes conversations that were created two or more days ago.
 * Usage: INTEGRATION_FRONT_TOKEN=<...> node ./scripts/ci/front-delete-conversations.js
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const Front = require('front-sdk').Front
const sub = require('date-fns/sub')
const environment = require('@balena/jellyfish-environment').defaultEnvironment

const BEFORE = sub(new Date(), {
	hours: 2
}).getTime()
const CONVERSATION_LIMIT = 100
const CONVERSATION_CHECK_LIMIT = 10000
const DELAY = 500

/**
 * @summary Find and delete old Front test conversations
 * @function
 *
 * @param {Object} options - required Front options (API token and list of inbox IDs)
 *
 * @returns {Promise<Number>} the number of conversations deleted
 */
const deleteConversations = async (options) => {
	const context = {
		checked: 0,
		deleted: [],
		front: new Front(options.token)
	}
	const pageTokenRegex = /page_token=([a-z0-9A-Z]+)/

	// Loop through all test inboxes, getting old conversations.
	await Bluebird.each(options.inboxes, async (inbox) => {
		let pageToken = null
		while (true) {
			console.log(`Getting conversations for ${inbox}...`)
			let conversations = {}
			try {
				conversations = await context.front.inbox.listConversations({
					inbox_id: inbox,
					q: 'q[statuses][]=unassigned&q[statuses][]=assigned&q[statuses][]=archived',
					limit: CONVERSATION_LIMIT,
					page_token: pageToken
				})
			} catch (err) {
				handleError(err)
			}

			// Set next page token for subsequent search.
			if (conversations._pagination.next) {
				const pageTokenMatches = conversations._pagination.next.match(pageTokenRegex)
				if (pageTokenMatches.length === 2) {
					pageToken = pageTokenMatches[1]
				}
			}

			// Check if conversation is old enough to delete.
			await Bluebird.each(conversations._results, async (conversation) => {
				await deleteConversation(context, inbox, conversation)
			})
			context.checked += conversations._results.length

			// Break loop if no more conversations are left to delete.
			if (!conversations._pagination.next || context.checked >= CONVERSATION_CHECK_LIMIT) {
				break
			}
		}
	})

	return context.deleted.length
}

/**
 * @summary Delete a single Front conversation
 * @function
 *
 * @param {Object} context - process context
 * @param {String} inbox - inbox ID
 * @param {Object} conversation - conversation to delete
 */
const deleteConversation = async (context, inbox, conversation) => {
	if (_.includes(context.deleted, conversation.id)) {
		return
	}

	// `created_at` is in seconds and we want to compare it in ms
	if (conversation.created_at * 1000 <= BEFORE && conversation.status !== 'deleted') {
		try {
			await context.front.conversation.update({
				inbox_id: inbox,
				conversation_id: conversation.id,
				status: 'deleted'
			})
		} catch (err) {
			handleError(err)
		}
		context.deleted.push(conversation.id)
		await Bluebird.delay(DELAY)
	}
}

/**
 * @summary Validate set options
 * @function
 *
 * @param {Object} options - Front options
 */
const validate = (options) => {
	// Check that the Front token is set.
	if (!options.token) {
		handleError('Must set INTEGRATION_FRONT_TOKEN')
	}

	// Check that Front inbox IDs are set.
	if (options.inboxes.length === 0) {
		handleError('Must set TEST_INTEGRATION_FRONT_INBOX_1 and/or TEST_INTEGRATION_FRONT_INBOX_2')
	}
}

/**
 * @summary Handle errors
 * @function
 *
 * @param {String} msg - error message
 */
const handleError = (msg) => {
	console.error(msg)
	process.exit(0)
}

// Set required options and validate them.
const options = {
	token: environment.integration.front.api,
	inboxes: environment.test.integration.front.inboxes
}
validate(options)

// Delete old conversations using provided options.
deleteConversations(options)
	.then((total) => {
		console.log(`Deleted ${total} conversations`)
	})
	.catch((err) => {
		console.error(err)
	})

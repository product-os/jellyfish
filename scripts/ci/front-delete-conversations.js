/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* eslint-disable no-underscore-dangle */

/*
 * This script looks through Front inboxes and deletes conversations that were created two or more days ago.
 * Usage: INTEGRATION_FRONT_TOKEN=<...> node ./scripts/ci/front-delete-conversations.js
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const Front = require('front-sdk').Front
const moment = require('moment')
const environment = require('@balena/jellyfish-environment')

const BEFORE = moment.utc().subtract(1, 'days').hours(0).minutes(0).seconds(0).unix()
const CONVERSATION_LIMIT = 100
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
		deleted: [],
		front: new Front(options.token)
	}
	const pageTokenRegex = /page_token=([a-z0-9A-Z]+)/

	// Loop through all test inboxes, getting old conversations.
	await Bluebird.each(options.inboxes, async (inbox) => {
		console.log(`Looking through ${inbox}...`)
		let pageToken = null
		while (true) {
			console.log('Getting conversations...')
			let conversations = {}
			try {
				conversations = await context.front.inbox.listConversations({
					inbox_id: inbox,
					limit: CONVERSATION_LIMIT,
					page_token: pageToken
				})
			} catch (err) {
				handleError(err, 0)
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
				await deleteConversation(context, {
					id: conversation.id,
					inbox
				})
				context.deleted.push(conversation.id)
				await Bluebird.delay(DELAY)
			})

			// Break loop if no more conversations are left to delete.
			if (!conversations._pagination.next) {
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
 * @param {Object} context - Process context
 * @param {Object} conversation - ID and inbox ID of conversation to delete
 */
const deleteConversation = async (context, conversation) => {
	if (_.includes(context.deleted, conversation.id)) {
		return
	}
	console.log(`Checking ${conversation.inbox}:${conversation.id}...`)
	if (conversation.created_at <= BEFORE && conversation.status !== 'deleted') {
		console.log(`Deleting ${conversation.inbox}:${conversation.id}..`)
		try {
			await context.front.conversation.update({
				inbox_id: conversation.inbox,
				conversation_id: conversation.id,
				status: 'deleted'
			})
		} catch (err) {
			handleError(err, 0)
		}
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
		handleError('Must set INTEGRATION_FRONT_TOKEN', 1)
	}

	// Check that Front inbox IDs are set.
	if (options.inboxes.length === 0) {
		handleError('Must set TEST_INTEGRATION_FRONT_INBOX_1 and/or TEST_INTEGRATION_FRONT_INBOX_2', 1)
	}
}

/**
 * @summary Handle errors
 * @function
 *
 * @param {String} msg - error message
 * @param {Number} code - code to exit with
 */
const handleError = (msg, code) => {
	console.error(msg)
	process.exit(code)
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
		console.log(`Successfully deleted ${total} conversations`)
	})
	.catch((err) => {
		console.error(err)
	})

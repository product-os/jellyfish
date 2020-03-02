/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* eslint-disable no-underscore-dangle */

/*
 * This script looks through Front inboxes and deletes conversations that were created two or more days ago.
 * Usage: FRONT_TOKEN=<...> FRONT_INBOX_1=<...> FRONT_INBOX_2=<...> node ./scripts/ci/front-delete-conversations.js
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const Front = require('front-sdk').Front
const moment = require('moment')

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
	let total = 0
	const oldConversations = []
	const front = new Front(options.token)
	const pageTokenRegex = /page_token=([a-z0-9A-Z]+)/

	// Loop through all test inboxes, getting old conversations.
	await Bluebird.each(options.inboxes, async (inbox) => {
		console.log(`Looking through ${inbox}...`)
		let pageToken = null
		while (true) {
			const conversations = await front.inbox.listConversations({
				inbox_id: inbox,
				limit: CONVERSATION_LIMIT,
				page_token: pageToken
			})

			// Set next page token for subsequent search.
			if (conversations._pagination.next) {
				const pageTokenMatches = conversations._pagination.next.match(pageTokenRegex)
				if (pageTokenMatches.length === 2) {
					pageToken = pageTokenMatches[1]
				}
			}

			// Check if conversation is old enough to delete.
			conversations._results.forEach((conversation) => {
				if (conversation.created_at <= BEFORE && conversation.status !== 'deleted') {
					oldConversations.push(`${inbox}:${conversation.id}`)
				}
			})

			// Break loop if no more conversations are left to delete.
			if (!conversations._pagination.next) {
				break
			}
		}
	})

	// Delete old conversations.
	console.log(`Found ${oldConversations.length} old conversations to delete`)
	await Bluebird.each(oldConversations, async (conversation) => {
		console.log(`Deleting conversation: [${conversation}]...`)
		const [ inboxId, conversationId ] = conversation.split(':')
		await front.conversation.update({
			inbox_id: inboxId,
			conversation_id: conversationId,
			status: 'deleted'
		}).then(() => {
			total += 1
		}).catch((err) => {
			console.error(err)
		})
		await Bluebird.delay(DELAY)
	})
	return total
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
		handleError('Must set FRONT_TOKEN')
	}

	// Check that Front inbox IDs are set.
	if (options.inboxes.length === 0) {
		handleError('Must set FRONT_INBOX_1 and/or FRONT_INBOX_2')
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
	process.exit(1)
}

// Set required options and validate them.
const options = {
	token: process.env.FRONT_TOKEN,
	inboxes: _.compact([ process.env.FRONT_INBOX_1, process.env.FRONT_INBOX_2 ])
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

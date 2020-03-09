/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const actionIncrementHandler = require('./action-increment').handler
const actionCreateCardHandler = require('./action-create-card').handler

const handler = async (session, context, card, request) => {
	const names = _.castArray(request.arguments.name)
	return Bluebird.map(names, async (item) => {
		// Remove leading and trailing whitespace and # symbol
		const name = _.trim(item.toLowerCase().trim(), '#')
		const slug = `tag-${name}`

		const tagCard = await context.getCardBySlug(
			session, `${slug}@1.0.0`)

		const incrementOptions = {
			actor: request.actor,
			originator: request.originator,
			arguments: {
				path: [ 'data', 'count' ]
			}
		}

		if (tagCard) {
			return actionIncrementHandler(
				session,
				context,
				tagCard,
				incrementOptions)
		}

		const createOptions = {
			actor: request.actor,
			originator: request.originator,
			arguments: {
				properties: {
					slug,
					name,
					data: {
						count: 1
					}
				}
			}
		}

		try {
			return await actionCreateCardHandler(
				session,
				context,
				card,
				createOptions)
		} catch (error) {
			// Notice action-create-card throws an error if the card
			// you want to create already exists. Because we check if
			// the tag exists to decide whether to update or insert in
			// a non atomic way, two calls can concurrently think the
			// tag doesn't exist, and therefore one will fail.
			//
			// In order to ensure the tag number remains correct, we
			// can check if our insert failed, and if so retry using
			// an update instead.
			if (error.name === 'JellyfishElementAlreadyExists') {
				// Get the card again
				const input = await context.getCardBySlug(
					session, `${slug}@1.0.0`)

				return actionIncrementHandler(
					session,
					context,
					input,
					incrementOptions)
			}

			throw error
		}
	})
}

module.exports = {
	handler
}

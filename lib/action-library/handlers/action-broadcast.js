/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const actionCreateEventHandler = require('./action-create-event').handler
const assert = require('../../assert')

const handler = async (session, context, card, request) => {
	const eventBaseType = 'message'
	const eventType = `${eventBaseType}@1.0.0`
	const sessionCard = await context.getCardById(
		context.privilegedSession, context.privilegedSession)

	assert.INTERNAL(request.context, sessionCard,
		context.errors.WorkerNoElement, 'Privileged session is invalid')

	const messages = await context.query(context.privilegedSession, {
		type: 'object',
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id' ],
				properties: {
					id: {
						type: 'string',
						const: card.id
					}
				}
			}
		},
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: eventType
			},
			data: {
				type: 'object',
				additionalProperties: true,
				required: [ 'payload', 'actor' ],
				properties: {
					actor: {
						type: 'string',
						const: sessionCard.data.actor
					},
					payload: {
						type: 'object',
						required: [ 'message' ],
						properties: {
							message: {
								type: 'string',
								const: request.arguments.message
							}
						}
					}
				}
			}
		}
	})

	if (messages.length > 0) {
		return null
	}

	const eventRequest = Object.assign({}, request)
	eventRequest.arguments = {
		slug: await context.getEventSlug(`broadcast-${eventType.split('@')[0]}`),
		type: eventType.split('@')[0],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message: request.arguments.message
		}
	}

	/*
	 * Broadcast messages are posted by a high privilege user.
	 */
	return actionCreateEventHandler(
		context.privilegedSession, context, card, eventRequest)
}

module.exports = {
	handler
}

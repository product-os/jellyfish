/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const moment = require('moment')
const uuid = require('../../uuid')
const actionCreateEventHandler = require('./action-create-event').handler

const questions = [ '**Time for your daily standup** \n **What will be your primary focus for today?**',
	'**Are you facing any blockers requiring action from others?**',
	'**Any personal tidbits you\'d like to share?**' ]

const getMessageText = (messages) => {
	return _.map(messages, (message) => {
		return _.get(message, [ 'data', 'payload', 'message' ])
	})
}

const getQuestionsAsked = ({
	messages,
	bot
}) => {
	const botMessages = _.filter(messages, [ 'data.actor', bot.id ])
	return getMessageText(botMessages)
}

const getNextQuestion = ({
	messages,
	bot
}) => {
	if (!messages) {
		return questions[0]
	}
	const questionsAsked = getQuestionsAsked({
		messages,
		bot
	})
	const remainingQuestions = _.difference(questions, questionsAsked)
	if (remainingQuestions.length > 0) {
		return remainingQuestions[0]
	}
	return null
}

const getThread = async ({
	context,
	marker,
	session,
	request,
	date
}) => {
	const [ existingThread ] = await context.query(context.privilegedSession, {
		type: 'object',
		properties: {
			type: {
				const: 'thread@1.0.0'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			markers: {
				type: 'array',
				minItems: 1,
				items: {
					const: marker
				}
			}
		},
		$$links: {
			'has attached element': {
				type: 'object',
				properties: {
					type: {
						const: 'message@1.0.0'
					},
					created_at: {
						type: 'string',
						pattern: `${date}.+`
					}
				}
			}
		}
	}, {
		links: {
			'has attached element': {
				sortBy: 'created_at'
			}
		}
	})
	if (existingThread) {
		return existingThread
	}
	const typeCard = await context.getCardBySlug(session, 'thread@latest')
	return context.insertCard(context.privilegedSession, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachedEvents: true
	}, {
		version: typeCard.version,
		slug: await context.getEventSlug('thread'),
		markers: [ marker ]
	})
}

const sendQuestion = async ({
	context,
	question,
	request,
	session,
	thread,
	user,
	bot
}) => {
	const eventRequest = {
		timestamp: request.timestamp,
		actor: bot.id,
		originator: request.originator,
		arguments: {
			slug: `message-${await uuid.random()}`,
			type: 'message',
			payload: {
				mentionsUser: [],
				alertsUser: [],
				mentionsGroup: [],
				message: question,
				markers: `user-bot+${user}`
			}
		}
	}
	await actionCreateEventHandler(
		session, context, thread, eventRequest)
}

const createStandup = async ({
	messages,
	context,
	user,
	repository,
	date,
	request,
	bot
}) => {
	const typeCard = await context.getCardBySlug(context.privilegedSession, 'standup@latest')
	const messageStrings = getMessageText(messages)
	const standup = await context.insertCard(context.privilegedSession, typeCard, {
		timestamp: request.timestamp,
		actor: bot.id,
		originator: request.originator,
		attachedEvents: false
	}, {
		version: '1.0.0',
		slug: await context.getEventSlug('standup'),
		data: {
			user,
			repository,
			date,
			message: messageStrings.join('/n')
		}
	})
}

const handler = async (session, context, card, request) => {
	const {
		users,
		repository
	} = request.arguments
	const date = moment().format('YYYY-MM-DD')
	const bot = await context.getCardBySlug(session, 'user-bot@1.0.0')
	for (const user of users) {
		const marker = `user-bot+${user}`
		const thread = await getThread({
			context,
			date,
			marker,
			session,
			request
		})
		const messages = _.get(thread, [ 'links', 'has attached element' ])

		const question = getNextQuestion({
			messages, bot
		})

		if (question) {
			await sendQuestion({
				context,
				question,
				request,
				session,
				thread,
				user,
				bot
			})
		} else {
			await createStandup({
				messages,
				context,
				user,
				repository,
				date,
				request,
				bot
			})
		}
	}

	return {
		id: card.id,
		type: card.type,
		version: card.version,
		slug: card.slug
	}
}

module.exports = {
	handler
}

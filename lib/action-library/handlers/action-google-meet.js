/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const assert = require('../../assert')
const google = require('googleapis').google
const moment = require('moment')

const CALENDAR_ID = 'primary'
const GOOGLE_CALENDAR_API_VERSION = 'v3'

const handler = async (session, context, card, request) => {
	// This method looks for the GOOGLE_APPLICATION_CREDENTIALS environment variable
	// which should be set to the path of the JSON file containing the Google Service
	// account credentials.
	const auth = new google.auth.GoogleAuth({
		clientOptions: {
			// `subject` required to impersonate real account using service account
			// (neccessary for creating events with meet URLs)
			// Currently using same credentials as Hubot
			subject: 'hubot@balena.io'
		},
		scopes: [ 'https://www.googleapis.com/auth/calendar' ]
	})
	this.authClient = await auth.getClient()

	const calendarAPI = google.calendar({
		auth: this.authClient,
		version: GOOGLE_CALENDAR_API_VERSION
	})

	// The event meeting time is not particularly important as we'll delete it immediately
	const startTime = moment().subtract(10, 'day')
	const endTime = startTime.clone().add(1, 'hour')

	const event = await calendarAPI.events.insert(
		{
			calendarId: CALENDAR_ID,
			conferenceDataVersion: 1,
			requestBody: {
				summary: 'Jellyfish Generated Meet',
				end: {
					dateTime: endTime.toISOString()
				},
				start: {
					dateTime: startTime.toISOString()
				},
				conferenceData: {
					createRequest: {
						requestId: moment().valueOf().toString(),
						conferenceSolutionKey: {
							type: 'hangoutsMeet'
						}
					}
				}
			}
		}
	)

	if (!event.data.hangoutLink) {
		throw new Error('Meet/Hangout Link not found in the event\'s body')
	}

	await calendarAPI.events.delete({
		calendarId: CALENDAR_ID,
		eventId: event.data.id
	})

	const conferenceUrl = event.data.hangoutLink

	const typeCard = await context.getCardBySlug(
		session, `${card.type}@latest`)

	assert.INTERNAL(request.context, typeCard,
		context.errors.WorkerNoElement, `No such type: ${card.type}`)

	const patchResult = await context.patchCard(
		context.privilegedSession, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			originator: request.originator,
			attachEvents: true
		}, _.omit(card, [ 'type' ]), [
			{
				op: _.has(card, [ 'data', 'conferenceUrl' ]) ? 'replace' : 'add',
				path: '/data/conferenceUrl',
				value: conferenceUrl
			}
		])

	if (!patchResult) {
		return null
	}

	return {
		id: patchResult.id,
		type: patchResult.type,
		slug: patchResult.slug,
		version: patchResult.version,
		conferenceUrl
	}
}

module.exports = {
	handler
}

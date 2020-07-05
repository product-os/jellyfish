/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const sinon = require('sinon')
const google = require('googleapis').google
const {
	v4: uuid
} = require('uuid')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')

const GOOGLE_MEET_URL = 'https://meet.google.com/some-fake-room'

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)

	// Fake the Google APIs calls
	const auth = {
		getClient: sinon.fake.returns({})
	}
	google.auth.GoogleAuth = sinon.fake.returns(auth)
	const calendarAPI = {
		events: {
			insert: sinon.fake.resolves({
				data: {
					id: '1',
					hangoutLink: GOOGLE_MEET_URL
				}
			}),
			delete: sinon.fake.resolves({})
		}
	}
	google.calendar = sinon.fake.returns(calendarAPI)

	// Create a card that we'll add a conferenceUrl to
	test.context.card = await test.context.jellyfish.insertCard(test.context.context,
		test.context.session, {
			type: 'card@1.0.0',
			slug: `card-${uuid()}`,
			version: '1.0.0'
		})

	test.context.fakes = {
		getClient: auth.getClient,
		calendarAPI
	}
})

ava.after(helpers.worker.after)

ava('should return a conference URL', async (test) => {
	const {
		session,
		context,
		card,
		processAction
	} = test.context

	const result = await processAction(session, {
		action: 'action-google-meet@1.0.0',
		context,
		card: card.id,
		type: card.type,
		arguments: {}
	})

	test.is(result.data.conferenceUrl, GOOGLE_MEET_URL)
})

ava('should update the card with the conference URL', async (test) => {
	const {
		session,
		context,
		card,
		jellyfish,
		processAction
	} = test.context

	await processAction(session, {
		action: 'action-google-meet@1.0.0',
		context,
		card: card.id,
		type: card.type,
		arguments: {}
	})

	const [ updatedCard ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'id', 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: card.type
			},
			id: {
				type: 'string',
				const: card.id
			}
		}
	})

	test.is(updatedCard.data.conferenceUrl, GOOGLE_MEET_URL)
})

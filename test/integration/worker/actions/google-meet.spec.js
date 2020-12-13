/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const environment = require('@balena/jellyfish-environment')
const helpers = require('../helpers')

const hasCredentials = () => {
	try {
		const cred = JSON.parse(environment.integration['google-meet'].credentials)
		return !_.isEmpty(cred)
	} catch (err) {}
	return false
}

// Skip all tests if there are no credentials
const avaTest = !hasCredentials() || environment.test.integration.skip ? ava.serial.skip : ava.serial

ava.before(async (test) => {
	await helpers.worker.before(test)

	// Create a card that we'll add a conferenceUrl to
	test.context.card = await test.context.jellyfish.insertCard(test.context.context,
		test.context.session, {
			type: 'card@1.0.0',
			slug: `card-${uuid()}`,
			version: '1.0.0'
		})
})

ava.after(helpers.worker.after)

avaTest('should return a conference URL', async (test) => {
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

	test.true(result.data.conferenceUrl.startsWith('https://meet.google.com'))
})

avaTest('should update the card with the conference URL', async (test) => {
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

	test.true(updatedCard.data.conferenceUrl.startsWith('https://meet.google.com'))
})

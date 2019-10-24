/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../../sdk/helpers')
const environment = require('../../../../lib/environment')

ava.before(helpers.before)
ava.after(helpers.after)

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

if(environment.integration['google-meet'].credentials) {

	ava.serial('should create a new google meet using action-google-meet', async (test) => {

		const admin = await test.context.sdk.card.get('user-admin')

		const session = await test.context.sdk.card.create({
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

		const result = await test.context.http(
			'POST', '/api/v2/action', {
				card: 'card',
				type: 'type',
				action: 'action-google-meet',
				arguments: {
					reason: null,
					properties: {
						slug: test.context.generateRandomSlug({
							prefix: 'google-meet-test'
						})
					}
				}
			}, {
				Authorization: `Bearer ${session.id}`
			})

		const id = result.response.data.id

		const updatedCard = await test.context.sdk.card.get(id)

		const googleMeetRegex = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/

		test.truthy(updatedCard && updatedCard.data.conferenceUrl.match(googleMeetRegex))
	})
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const nock = require('nock')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')
const environment = require('@balena/jellyfish-environment')

const MAIL_OPTIONS = environment.mail.options

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)
})

ava.after(async (test) => {
	helpers.worker.after(test)
	nock.cleanAll()
})

const avaTest = _.some(_.values(MAIL_OPTIONS), _.isEmpty) ? ava.skip : ava.serial

const checkForKeyValue = (key, value, text) => {
	const pattern = new RegExp(`name="${key}"\\s*${value}`, 'm')
	const regex = text.search(pattern)
	return regex !== -1
}

ava.serial('action send-email should send an email', async (test) => {
	let actualBody

	nock(`${MAIL_OPTIONS.baseUrl}/${MAIL_OPTIONS.domain}`)
		.post('/messages', (body) => {
			actualBody = body
			return body
		})
		.basicAuth({
			user: 'api',
			pass: MAIL_OPTIONS.token
		})
		.reply(200)

	const requestPasswordResetCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'card@1.0.0',
		version: '1.0.0',
		slug: 'password-reset-1',
		data: {}
	})

	const	toAddress = 'to@address.com'
	const fromAddress = 'from@address.com'
	const subject = 'fake subject'
	const html = 'fake body'

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-send-email@1.0.0',
		context: test.context.context,
		card: requestPasswordResetCard.id,
		type: requestPasswordResetCard.type,
		arguments: {
			toAddress,
			fromAddress,
			subject,
			html
		}
	})

	await test.context.flush(test.context.session)

	const result = await test.context.queue.producer.waitResults(test.context.context, request)

	test.false(result.error)
	const fromIsInBody = checkForKeyValue('from', fromAddress, actualBody)
	const toIsInBody = checkForKeyValue('to', toAddress, actualBody)
	const subjectIsInBody = checkForKeyValue('subject', subject, actualBody)
	const textIsInBody = checkForKeyValue('html', html, actualBody)

	test.true(fromIsInBody)
	test.true(toIsInBody)
	test.true(subjectIsInBody)
	test.true(textIsInBody)
})

avaTest('live: action send-email should send an email', async (test) => {
	const requestPasswordResetCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'card@1.0.0',
		version: '1.0.0',
		slug: 'password-reset-1',
		data: {}
	})

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-send-email@1.0.0',
		context: test.context.context,
		card: requestPasswordResetCard.id,
		type: requestPasswordResetCard.type,
		arguments: {
			toAddress: 'test1@balenateam.m8r.co',
			fromAddress: 'hello@balena.io',
			subject: 'sending real email',
			html: 'with real text in the body'
		}
	})

	await test.context.flush(test.context.session)

	const result = await test.context.queue.producer.waitResults(test.context.context, request)

	test.is(JSON.parse(result.data).message, 'Queued. Thank you.')
})

avaTest('live: action send-email should throw an error when the email is invalid', async (test) => {
	const requestPasswordResetCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'card@1.0.0',
		version: '1.0.0',
		slug: 'password-reset-1',
		data: {}
	})

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-send-email@1.0.0',
		context: test.context.context,
		card: requestPasswordResetCard.id,
		type: requestPasswordResetCard.type,
		arguments: {
			toAddress: 'test@test',
			fromAddress: 'hello@balena.io',
			subject: 'sending real email',
			html: 'with real text in the body'
		}
	})

	await test.throwsAsync(test.context.flush(test.context.session))
	const result = await test.context.queue.producer.waitResults(test.context.context, request)

	test.true(result.error)
	test.is(result.data.name, 'StatusCodeError')
})

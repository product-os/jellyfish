#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const nock = require('nock')
const environment = require('../../../lib/environment')
const MailgunIntegration = require('../../../lib/mail')

const TOKEN = environment.integration.mailgun

const liveAva = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava.serial

ava.serial('The correct HTTP request is sent to mailgun when we send an email', async (test) => {
	let actualBody
	const token = 'fake-token'

	const mailgun = new MailgunIntegration({
		token: {
			api: token
		}
	})

	nock(mailgun.requestDomain)
		.post('/messages', (body) => {
			actualBody = body
			return body
		})
		.basicAuth({
			user: 'api',
			pass: token
		})
		.reply(200)

	const toAddress = 'correct@address.io'
	const subject = 'sending email'
	const text = 'with this in the body'

	await mailgun.sendEmail({
		toAddress,
		subject,
		text
	})

	test.true(actualBody.search(/name="from"\s*Jel.ly.fish <no-reply@mail.jel.ly.fish>/m) !== -1)
	test.true(actualBody.search(/name="to"\s*correct@address\.io/m) !== -1)
	test.true(actualBody.search(/name="subject"\s*sending email/m) !== -1)
	test.true(actualBody.search(/name="text"\s*with this in the body/m) !== -1)

	await nock.cleanAll()
})

liveAva('Successfully sends email when tokens are supplied', async (test) => {
	const mailgun = new MailgunIntegration({
		token: {
			api: TOKEN.api
		}
	})

	const toAddress = 'test1@balenateam.m8r.co'
	const subject = 'sending real email'
	const text = 'with real text in the body'

	const res = await mailgun.sendEmail({
		toAddress,
		subject,
		text
	})

	test.is(JSON.parse(res).message, 'Queued. Thank you.')
})

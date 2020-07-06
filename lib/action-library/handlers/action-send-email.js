/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Mailgun = require('../../mail')
const environment = require('@balena/jellyfish-environment')

const handler = async (session, context, card, request) => {
	const {
		fromAddress,
		toAddress,
		subject,
		html
	} = request.arguments

	const mailgun = new Mailgun(environment.mail)

	const response = await mailgun.sendEmail({
		toAddress,
		fromAddress,
		subject,
		html
	})

	return response
}

module.exports = {
	handler
}

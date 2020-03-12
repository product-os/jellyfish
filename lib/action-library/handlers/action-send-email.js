/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Mailgun = require('../../mail')
const environment = require('../../environment')

const handler = async (session, context, card, request) => {
	const {
		fromAddress,
		toAddress,
		subject,
		body
	} = request.arguments

	const mailgun = new Mailgun({
		token: environment.integration.mailgun
	})

	const response = await mailgun.sendEmail({
		toAddress,
		fromAddress,
		subject,
		text: body
	})

	return response
}

module.exports = {
	handler
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const request = require('request-promise')

module.exports = class MailgunIntegration {
	constructor (options) {
		this.options = options
		this.domain = options.domain
		this.requestDomain = `${this.options.baseUrl}/${this.domain}`
		this.auth = {
			user: 'api',
			pass: this.options.token
		}
	}

	async sendEmail ({
		toAddress,
		fromAddress = `Jel.ly.fish <no-reply@${this.domain}>`,
		subject,
		html
	}) {
		const options = {
			method: 'POST',
			auth: this.auth,
			uri: `${this.requestDomain}/messages`,
			formData: {
				from: fromAddress,
				to: toAddress,
				subject,
				html
			}
		}
		return request(options)
	}
}

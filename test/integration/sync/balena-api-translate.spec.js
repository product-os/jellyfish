/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const querystring = require('querystring')
const randomstring = require('randomstring')
const url = require('native-url')
const jose = require('node-jose')
const jws = require('jsonwebtoken')
const scenario = require('./scenario')
const environment = require('@balena/jellyfish-environment')
const TOKEN = environment.integration['balena-api']
const helpers = require('./helpers')

ava.serial.before(async (test) => {
	await scenario.before(test)
	await helpers.save(test)
})

ava.serial.after.always(scenario.after)
ava.serial.afterEach.always(scenario.afterEach)

const prepareEvent = async (event) => {
	const signedToken = jws.sign({
		data: event.payload
	}, Buffer.from(TOKEN.privateKey, 'base64'), {
		algorithm: 'ES256',
		expiresIn: 10 * 60 * 1000,
		audience: 'jellyfish',
		issuer: 'api.balena-cloud.com',
		jwtid: randomstring.generate(20),
		subject: `${event.payload.id}`
	})

	const keyValue = Buffer.from(TOKEN.production.publicKey, 'base64')
	const encryptionKey = await jose.JWK.asKey(keyValue, 'pem')

	const cipher = jose.JWE.createEncrypt({
		format: 'compact'
	}, encryptionKey)
	cipher.update(signedToken)

	const result = await cipher.final()
	event.source = 'balena-api'
	event.payload = result
	event.headers['content-type'] = 'application/jose'
	return event
}

scenario.run(ava, {
	integration: require('../../../lib/sync/integrations/balena-api'),
	scenarios: require('./webhooks/balena-api'),
	baseUrl: 'https://api.balena-cloud.com',
	stubRegex: /.*/,
	source: 'balena-api',
	prepareEvent,
	options: {
		token: TOKEN
	},
	isAuthorized: (self, request) => {
		const params = querystring.parse(url.parse(request.path).query)
		return params.api_key === self.options.token.api &&
			params.api_username === self.options.token.username
	}
})

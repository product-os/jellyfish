/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const jose = require('node-jose')
const Bluebird = require('bluebird')
const geoip = require('geoip-lite')
const jwt = require('jsonwebtoken')
const randomstring = require('randomstring')
const request = require('request')
const assert = require('@balena/jellyfish-assert')
const environment = require('../../environment')
const utils = require('./utils')

const integration = environment.integration['balena-api']

const getMirrorId = (baseUrl, id) => {
	return `${baseUrl}/v5/user(${id})`
}

const updateProperty = (object, path, value, options) => {
	const finalValue = options.upsert
		? value || _.get(options.fallback, path) || _.get(object, path)
		: value || _.get(options.fallback, path)
	if (finalValue) {
		_.set(object, path, finalValue)
	} else {
		_.unset(object, path)
	}
}

const decryptPayload = async (token, payload) => {
	if (!token.privateKey) {
		return null
	}

	const key = await jose.JWK.asKey(
		Buffer.from(token.privateKey, 'base64'),
		'pem')

	const decrypter = jose.JWE.createDecrypt(key)
	const plainText = await decrypter.decrypt(payload)
		.catch(_.constant(null))
	if (!plainText) {
		return null
	}

	const signedToken = plainText.plaintext.toString('utf8')
	const source = jwt.decode(signedToken).data.source

	const publicKey = source === 'api.balena-staging.com'
		? token.staging && token.staging.publicKey
		: token.production && token.production.publicKey
	if (!publicKey) {
		return null
	}

	const verificationKey = Buffer.from(publicKey, 'base64')

	return new Bluebird((resolve) => {
		jwt.verify(signedToken, verificationKey, (error, result) => {
			if (error) {
				return resolve(null)
			}

			return resolve(result.data)
		})
	})
}

module.exports = class BalenaAPIIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
	}

	// eslint-disable-next-line class-methods-use-this
	async initialize () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async destroy () {
		return Bluebird.resolve()
	}

	// eslint-disable-next-line class-methods-use-this
	async mirror (card, options) {
		return []
	}

	async translate (event) {
		const payload = await decryptPayload(
			this.options.token, event.data.payload)
		if (!payload) {
			return []
		}

		this.context.log.info('Translating Balena API payload', {
			payload
		})

		// Not supported yet
		if (payload.resource !== 'user') {
			return []
		}

		// Ignore update events with no info at all
		// apart from the user id, as we can't do
		// much in this case anyways.
		if (payload.resource === 'user' &&
			payload.type === 'create' &&
			!payload.payload.username) {
			return []
		}

		const baseUrl = `https://${payload.source}`
		const mirrorId = getMirrorId(baseUrl, payload.payload.id)
		const mirrorIdUserCard =
			await this.context.getElementByMirrorId('user@1.0.0', mirrorId)

		// The Balena API doesn't emit actors in events, so most
		// of them will be done by the admin user.
		const adminActorId = await this.context.getActorId({
			handle: this.options.defaultUser
		})

		assert.INTERNAL(null, adminActorId,
			this.options.errors.SyncNoActor,
			`Not such actor: ${this.options.defaultUser}`)
		assert.INTERNAL(null, payload.payload.username,
			this.options.errors.SyncNoActor,
			() => {
				return `No username: ${JSON.stringify(payload, null, 2)}`
			})

		const sequence = []
		const slug = `user-${utils.slugify(payload.payload.username)}`
		const userCard = await this.context.getElementBySlug(`${slug}@latest`)
		const unifiesProfiles = mirrorIdUserCard &&
			userCard &&
			mirrorIdUserCard.slug !== userCard.slug

		const defaultCard = unifiesProfiles ? mirrorIdUserCard : null
		const match = userCard || mirrorIdUserCard || {
			slug,
			type: 'user@1.0.0',
			tags: [],
			links: {},
			markers: [],
			active: true,
			data: {
				roles: [ 'user-external-support' ],

				// See  https://github.com/product-os/jellyfish/issues/2011
				hash: 'PASSWORDLESS'
			}
		}

		match.data.mirrors = (match.data.mirrors || []).filter((mirror) => {
			return !mirror.startsWith(baseUrl)
		})

		if (payload.type === 'delete') {
			match.active = false
		} else {
			match.data.mirrors.push(mirrorId)
		}

		const currentEmail =
			(mirrorIdUserCard && userCard && mirrorIdUserCard.slug === userCard.slug)
				? null
				: match.data.email
		const email = payload.payload.email || currentEmail

		const updateOptions = {
			upsert: unifiesProfiles,
			fallback: defaultCard
		}

		updateProperty(match,
			[ 'data', 'email' ], email, updateOptions)
		updateProperty(match,
			[ 'data', 'profile', 'company' ],
			payload.payload.company, updateOptions)
		updateProperty(match,
			[ 'data', 'profile', 'type' ],
			payload.payload.account_type, updateOptions)
		updateProperty(match,
			[ 'data', 'profile', 'name', 'first' ],
			payload.payload.first_name, updateOptions)
		updateProperty(match,
			[ 'data', 'profile', 'name', 'last' ],
			payload.payload.last_name, updateOptions)

		if (payload.payload.ip) {
			const location = geoip.lookup(payload.payload.ip)
			if (location) {
				updateProperty(match,
					[ 'data', 'profile', 'city' ],
					location.city, updateOptions)
				updateProperty(match,
					[ 'data', 'profile', 'country' ],
					location.country, updateOptions)
			}
		}

		if (!match.data.translateDate ||
			new Date(payload.timestamp) > new Date(match.data.translateDate)) {
			match.data.translateDate =
				new Date(payload.timestamp).toISOString()

			sequence.push({
				time: new Date(payload.timestamp),
				actor: adminActorId,
				card: match
			})
		}

		if (unifiesProfiles) {
			mirrorIdUserCard.data.mirrors =
				_.without(mirrorIdUserCard.data.mirrors, mirrorId)
			mirrorIdUserCard.data.translateDate =
				new Date(payload.timestamp).toISOString()
			mirrorIdUserCard.active = false

			sequence.push({
				time: new Date(payload.timestamp),
				actor: adminActorId,
				card: mirrorIdUserCard
			})
		}

		this.context.log.info('Returning Balena API updates', {
			sequence
		})

		return sequence
	}
}

module.exports.isEventValid = async (token, rawEvent, headers) => {
	if (!token) {
		return false
	}

	const data = await decryptPayload(token, rawEvent)
	return Boolean(data)
}

module.exports.OAUTH_BASE_URL = integration.oauthBaseUrl
module.exports.OAUTH_SCOPES = []

module.exports.whoami = async (context, credentials, options, retries = 10) => {
	const {
		code: statusCode,
		body: externalUser
	} = await new Bluebird((resolve, reject) => {
		request({
			uri: `${module.exports.OAUTH_BASE_URL}/user/v1/whoami`,
			headers: {
				Authorization: `${credentials.token_type} ${credentials.access_token}`
			},
			json: true
		}, (error, response, body) => {
			if (error) {
				return reject(error)
			}

			return resolve({
				code: response.statusCode,
				body
			})
		})
	})

	// Take rate limiting into account
	if (statusCode === 429 && retries > 0) {
		await Bluebird.delay(5000)
		return module.exports.whoami(credentials, context, options, retries - 1)
	}

	assert.INTERNAL(context, externalUser && statusCode === 200,
		options.errors.SyncExternalRequestError,
		`Failed to fetch user information from balena-api. Response status code: ${statusCode}`)

	return externalUser
}

module.exports.match = (context, externalUser, options) => {
	assert.INTERNAL(context, externalUser,
		options.errors.SyncInvalidArg,
		'External user is a required parameter')

	const slug = `user-${utils.slugify(externalUser.username)}@latest`
	return context.getElementBySlug(slug)
}

module.exports.getExternalUserSyncEventData = async (context, externalUser, options) => {
	assert.INTERNAL(context, externalUser,
		options.errors.SyncInvalidArg,
		'External user is a required parameter')

	const event = {
		source: 'balena-api',
		headers: {
			accept: '*/*',
			connection: 'close',
			'content-type': 'application/jose'
		},
		payload: {
			timestamp: new Date().toISOString(),
			resource: 'user',
			source: 'api.balena-cloud.com',
			type: 'create',
			payload: externalUser
		}
	}

	const signedToken = jwt.sign({
		data: event.payload
	}, Buffer.from(integration.privateKey, 'base64'), {
		algorithm: 'ES256',
		expiresIn: 10 * 60 * 1000,
		audience: 'jellyfish',
		issuer: 'api.balena-cloud.com',
		jwtid: randomstring.generate(20),
		subject: `${event.payload.id}`
	})

	const keyValue = Buffer.from(integration.production.publicKey, 'base64')
	const encryptionKey = await jose.JWK.asKey(keyValue, 'pem')

	const cipher = jose.JWE.createEncrypt({
		format: 'compact'
	}, encryptionKey)
	cipher.update(signedToken)

	const result = await cipher.final()
	event.payload = result
	return event
}

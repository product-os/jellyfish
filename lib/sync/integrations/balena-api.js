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
const environment = require('@balena/jellyfish-environment')
const utils = require('./utils')

const integration = environment.integration['balena-api']

const getMirrorId = (host, id, type, version = 'v5') => {
	return `https://${host}/${version}/${type}(${id})`
}

const getCardSlug = (type, name) => {
	return `${type.split('@')[0]}-${utils.slugify(name)}`
}

const userCreateContainsUsername = (payload) => {
	// Ignore update events with no info at all
	// apart from the user id, as we can't do
	// much in this case anyways.

	// Return if not user resource
	if (!payload.resource === 'user') {
		return false
	}

	// Return if not username
	if (!payload.payload.username) {
		return false
	}

	return true
}

const getPreExistingCard = async (context, payload, cardType) => {
	// Get the pre-existing card by mirror id
	const mirrorId = getMirrorId(payload.source, payload.payload.id, payload.resource)
	return context.getElementByMirrorId(cardType, mirrorId)
}

const makeCard = (card, actor, time) => {
	let date = new Date()
	if (time) {
		date = new Date(time)
	}

	return {
		time: date,
		card,
		actor
	}
}

const mergeCardWithPayload = (preExistingCard, payload, cardType) => {
	// If there is no preExistingCard default to empty object
	const card = Object.assign({}, preExistingCard) || {
		tags: [],
		links: {},
		markers: []
	}

	// Configure options for updateProperty()
	const cardDate = new Date(_.get(card, [ 'data', 'translateDate' ]))
	const payloadDate = new Date(payload.timestamp)

	// Only update fields if the payload was emittedmore recently then the last translatedate
	if (preExistingCard && payloadDate.getTime() < cardDate.getTime()) {
		return preExistingCard
	}

	// Setup base card fields

	// Set active to true, unless handling a delete event
	// Note we never re-activate a card when deactivated
	if (card.active !== false) {
		_.set(card, [ 'active' ], payload.type !== 'delete')
	}

	// Add the mirrorId to the list of card mirrors
	const mirrorId = getMirrorId(payload.source, payload.payload.id, payload.resource)
	const mirrors = _.get(card, [ 'data', 'mirrors' ], []).concat(mirrorId)
	_.set(card, [ 'data', 'mirrors' ], _.uniq(mirrors))

	// Set card type
	_.set(card, [ 'type' ], cardType)

	// Set or update timestamp
	// TODO ensure that updates that ONLY change the translatedate are ignored, as nothing has been translated
	const timestamp = new Date(payload.timestamp).toISOString()
	updateProperty(card, [ 'data', 'translateDate' ], timestamp)

	if (cardType === 'user@1.0.0') {
		const slug = getCardSlug(
			cardType,
			payload.payload.username
		)
		updateProperty(card, [ 'slug' ], slug)

		updateProperty(card, [ 'name' ], payload.payload.username.trim())

		// Setup user roles to external support role if no pre-existingCard exists
		if (!preExistingCard) {
			updateProperty(card, [ 'data', 'roles' ], [ 'user-external-support' ])
			updateProperty(card, [ 'data', 'hash' ], 'PASSWORDLESS')
		}

		updateProperty(card, [ 'data', 'email' ], payload.payload.email)

		updateProperty(
			card,
			[ 'data', 'profile', 'company' ],
			payload.payload.company
		)

		updateProperty(
			card,
			[ 'data', 'profile', 'type' ],
			payload.payload.account_type
		)

		updateProperty(
			card,
			[ 'data', 'profile', 'name', 'first' ],
			payload.payload.first_name
		)

		updateProperty(
			card,
			[ 'data', 'profile', 'name', 'last' ],
			payload.payload.last_name
		)

		if (payload.payload.ip) {
			const location = geoip.lookup(payload.payload.ip)
			if (location) {
				updateProperty(
					card,
					[ 'data', 'profile', 'city' ],
					location.city
				)
				updateProperty(
					card,
					[ 'data', 'profile', 'country' ],
					location.country
				)
			}
		}
	}

	if (cardType === 'account@1.0.0') {
		const slug = getCardSlug(
			cardType,
			payload.payload.company_name
		)

		if (!_.has(card, [ 'slug' ])) {
			updateProperty(card, [ 'slug' ], slug)
		}

		updateProperty(
			card, [ 'name' ],
			payload.payload.company_name
		)

		updateProperty(
			card,
			[ 'data', 'internal_company_name' ],
			payload.payload.internal_company_name
		)

		updateProperty(
			card,
			[ 'data', 'internal_note' ],
			payload.payload.internal_note
		)

		updateProperty(
			card,
			[ 'data', 'tradegecko_company_id' ],
			payload.payload.tradegecko_company_id
		)

		updateProperty(
			card,
			[ 'data', 'industry' ],
			payload.payload.industry
		)

		updateProperty(
			card,
			[ 'data', 'website' ],
			payload.payload.website
		)

		updateProperty(
			card,
			[ 'data', 'username' ],
			payload.payload.handle
		)

		updateProperty(
			card,
			[ 'data', 'billing_account_code' ],
			payload.payload.billing_account_code
		)
	}

	return card
}

// TODO: Use JSON patch here
const updateProperty = (object, path, value) => {
	// If the value is undefined, and the payload is more recent than the card

	if (_.isUndefined(value)) {
		// Remove the paylad
		_.unset(object, path)
	} else if (value) {
		// If we do have a value, set it.
		_.set(object, path, value)
	}
}

const decryptPayload = async (token, payload) => {
	if (!token.privateKey) {
		return null
	}

	const key = await jose.JWK.asKey(
		Buffer.from(token.privateKey, 'base64'),
		'pem'
	)

	const decrypter = jose.JWE.createDecrypt(key)
	const plainText = await decrypter.decrypt(payload).catch(_.constant(null))
	if (!plainText) {
		return null
	}

	const signedToken = plainText.plaintext.toString('utf8')
	const source = jwt.decode(signedToken).data.source

	const publicKey =
		source === 'api.balena-staging.com'
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

	// Translate an external webhook event from the balena API.
	//
	// The translate process goes through the following steps.
	// 1. Decrypt the event payload
	// 2. Ignore empty or useless payloads
	// 3. Define the type of card that will be created
	// 4. Get any pre-existing card for this event
	// 5. Merge card with payload
	// 			1. Update or create field values
	// 			2. If there is an ip attached to the payload use it to retrieve an address and set it on the card
	// 6. Set Actor of translate event
	// 7. Build up translate sequence
	async translate (event) {
		// 1. Decrypt the event payload
		this.context.log.info('Balena-API Translate: Decrypt event payload')

		const payload = await decryptPayload(
			this.options.token,
			event.data.payload
		)

		// 2. Ignore empty or useless payloads

		if (!payload) {
			this.context.log.info(
				'Balena-API Translate: Ignoring empty or useless', {
					event: event.slug
				}
			)

			// Return early when payload is empty
			return []
		}

		// Ignore create events with no useful information
		// TODO: Ensure that balenaAPI sends meaningful webhook data when a resource is created
		if (payload.type === 'create') {
			// If payload doesn't contain the username we can ignore this update event
			if (userCreateContainsUsername(payload) === false) {
				this.context.log.info('Balena-API Translate: create event doesn\'t contain username, ignoring translate event')
				return []
			}
		}

		// 3. Define the type of card that will be created
		let cardType = null

		if (payload.resource === 'user') {
			// All users automatically get a contact generated by triggered-action-user-contact.json
			cardType = 'user@1.0.0'
		} else if (payload.resource === 'organization') {
			cardType = 'account@1.0.0'
		} else {
			this.context.log.info(`Balena-API Translate: not translating unknown resource ${payload.resource}`)
			return []
		}

		this.context.log.info(`Balena-API Translate: translating Balena ${payload.resource} => Jellyfish ${cardType}`)

		// 4. Get pre-existing card
		this.context.log.info('Balena-API Translate: Get pre-existing card')

		const preExistingCard = await getPreExistingCard(this.context, payload, cardType)

		// 5. Merge card with payload
		this.context.log.info('Balena-API Translate: Merge card with payload')

		const newCard = mergeCardWithPayload(preExistingCard, payload, cardType)

		// 6. Set actor of translate event
		this.context.log.info(
			'Balena-API Translate: Set actor of translate event'
		)

		// The Balena API doesn't emit actors in events, so most
		// of them will be done by the admin user.
		const actor = await this.context.getActorId({
			handle: this.options.defaultUser
		})

		// 7. build up translate sequence
		this.context.log.info(
			'Balena-API Translate: build up translate sequence'
		)

		const sequence = []
		sequence.push(makeCard(newCard, actor, _.get(newCard, [ 'data', 'translateDate' ])))

		this.context.log.info(
			'Balena-API Translate: Translating Balena API updates',
			{
				sequence
			}
		)

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
		code: statusCode, body: externalUser
	} = await new Bluebird(
		(resolve, reject) => {
			request(
				{
					uri: `${module.exports.OAUTH_BASE_URL}/user/v1/whoami`,
					headers: {
						Authorization: `${credentials.token_type} ${credentials.access_token}`
					},
					json: true
				},
				(error, response, body) => {
					if (error) {
						return reject(error)
					}

					return resolve({
						code: response.statusCode,
						body
					})
				}
			)
		}
	)

	// Take rate limiting into account
	if (statusCode === 429 && retries > 0) {
		await Bluebird.delay(5000)
		return module.exports.whoami(credentials, context, options, retries - 1)
	}

	assert.INTERNAL(
		context,
		externalUser && statusCode === 200,
		options.errors.SyncExternalRequestError,
		`Failed to fetch user information from balena-api. Response status code: ${statusCode}`
	)

	return externalUser
}

module.exports.match = (context, externalUser, options) => {
	assert.INTERNAL(
		context,
		externalUser,
		options.errors.SyncInvalidArg,
		'External user is a required parameter'
	)

	const slug = `user-${utils.slugify(externalUser.username)}@latest`
	return context.getElementBySlug(slug)
}

module.exports.getExternalUserSyncEventData = async (
	context,
	externalUser,
	options
) => {
	assert.INTERNAL(
		context,
		externalUser,
		options.errors.SyncInvalidArg,
		'External user is a required parameter'
	)

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

	const signedToken = jwt.sign(
		{
			data: event.payload
		},
		Buffer.from(integration.privateKey, 'base64'),
		{
			algorithm: 'ES256',
			expiresIn: 10 * 60 * 1000,
			audience: 'jellyfish',
			issuer: 'api.balena-cloud.com',
			jwtid: randomstring.generate(20),
			subject: `${event.payload.id}`
		}
	)

	const keyValue = Buffer.from(integration.production.publicKey, 'base64')
	const encryptionKey = await jose.JWK.asKey(keyValue, 'pem')

	const cipher = jose.JWE.createEncrypt(
		{
			format: 'compact'
		},
		encryptionKey
	)
	cipher.update(signedToken)

	const result = await cipher.final()
	event.payload = result
	return event
}

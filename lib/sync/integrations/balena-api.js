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
const assert = require('../../assert')
const environment = require('../../environment')
const utils = require('./utils')

const integration = environment.integration['balena-api']

const getMirrorId = (host, id, type, version = 'v5') => {
	return `${host}/${version}/${type}(${id})`
}

const getType = (type) => {
	if (!type) return type
	return `${type}@1.0.0`
}

const getUserCardSlug = (type, name, version = 'latest') => {
	const slug = `${type}-${utils.slugify(name)}`

	if (!version) {
		return slug
	}

	return `${slug}@${version}`
}

const userCreateContainsUsername = (payload) => {
	// Ignore update events with no info at all
	// apart from the user id, as we can't do
	// much in this case anyways.
	console.log('create - 2', !payload.resource === 'user')

	// Return if not user resource
	if (!payload.resource === 'user') return false

	console.log('create - 3', !payload.payload.username)

	// Return if not username
	if (!payload.payload.username) return false

	return true
}

const getPreExistingCard = async (payload, context) => {
	// Get the pre-existing card

	// For non users we get the card by mirror id
	const mirrorId = getMirrorId(payload.source, payload.payload.id, payload.resource)
	const mirrorType = getType(payload.targetCard)
	return context.getElementByMirrorId(mirrorType, mirrorId)
}

const setCard = (payload, preExistingCard, context) => {
	// Return early if the pre-existing card exists
	context.log.info('Balena-API Translate: payload', payload)
	if (preExistingCard && preExistingCard.type === getType(payload.targetCard)) {
		context.log.info('Balena-API Translate: preExistingCard', preExistingCard)
		return preExistingCard
	}

	// When we don't have a card yet
	// Create the card structure for the new card
	// We set the bare minimum
	// - type
	// - active

	const card = {
		type: getType(payload.targetCard)
	}
	context.log.info('Balena-API Translate: card 1', card)

	if (payload.targetCard === 'user') {
		// If it's a user card we also set
		// - data
		// 		- roles
		// 		- hash
		// For inforation about the 'PASSWORDLESS' hash
		// See  https://github.com/balena-io/jellyfish/issues/2011
		card.slug = getUserCardSlug(
			payload.targetCard,
			payload.payload.username,
			false
		)
		card.data = {
			roles: [ 'user-external-support' ],
			hash: 'PASSWORDLESS'
		}
	}

	if (payload.targetCard === 'account') {
		card.slug = getUserCardSlug(
			payload.targetCard,
			payload.payload.username,
			false
		)
	}

	// TODO: Do we need to catch card types we don't support?
	// If we don't explicitly set a slug the translate will fail.
	context.log.info('Balena-API Translate: card 2', card)

	return card
}

const setEmail = (card, payload) => {
	// Use If we have a payload email use that
	if (payload.payload.email) {
		return payload.payload.email
	}

	// If not use the pre-existing card email
	if (card) {
		return card.data.email
	}

	// If no email at all return null
	return null
}

const buildSquence = (card, payload, actor) => {
	const sequence = []

	const cardHasTranslateDate = card.data.translateDate
	const payloadTimetamp = new Date(payload.timestamp)
	const cardTimestamp = new Date(card.data.translateDate)

	// If we don't have a translate date, or
	// if the payload timestap is more recent than the card timestamp
	if (!cardHasTranslateDate || payloadTimetamp > cardTimestamp) {
		// Update the card translate date, with the payload timestamp
		card.data.translateDate = new Date(payload.timestamp).toISOString()
	}

	// WHen we need to unify multiple cards, this should run
	// was part of unifiesProfiles logic
	// TODO: check if this works correctly
	// card.data.mirrors = _.without(card.data.mirrors, mirrorId)
	// card.data.translateDate = new Date(payload.timestamp).toISOString()

	sequence.push({
		time: new Date(payload.timestamp),
		actor,
		card
	})

	return sequence
}

const mergedCardWithPayload = (card, payload) => {
	// Filter card mirrors to only include
	// mirrors that startWith the payload baseUrl
	const mirrors = _.get(card, [ 'data', 'mirrors' ], [])
	_.set(card, [ 'data', 'mirrors' ], _.uniq(mirrors))

	if (payload.type === 'delete') {
		card.active = false
	} else {
		card.active = true
		const mirrorId = getMirrorId(payload.source, payload.payload.id, payload.resource)
		if (!mirrors.includes(mirrorId)) {
			card.data.mirrors.push(mirrorId)
		}
	}

	const updateOptions = {
		// ??? do we need this upsert still?
		upsert: true,
		fallback: card
	}

	if (payload.targetCard === 'user') {
		const email = setEmail(card, payload)

		updateProperty(card, [ 'data', 'email' ], email, updateOptions)
		updateProperty(
			card,
			[ 'data', 'profile', 'company' ],
			payload.payload.company,
			updateOptions
		)
		updateProperty(
			card,
			[ 'data', 'profile', 'type' ],
			payload.payload.account_type,
			updateOptions
		)
		updateProperty(
			card,
			[ 'data', 'profile', 'name', 'first' ],
			payload.payload.first_name,
			updateOptions
		)
		updateProperty(
			card,
			[ 'data', 'profile', 'name', 'last' ],
			payload.payload.last_name,
			updateOptions
		)

		// Interface ExternalResourceTypeHandler {
		// 	filter: schema
		// 	transform: (event) => Card[]
		// }

		// BalenaUserHandler implements ExternalResourceTypeHandler {
		// 	async transform (event) {
		// 		card = retrieveByMirror(event.p.id) || genericUser()

		// 		patchSeq = []

		// 		if (this then that) {
		// 			pathSeq.push(patch)
		// 		}
		// 	}
		// }

		// balena.translate = (p) => {
		// 	handlers = [
		// 		BalenaUserHandler,
		// 		BalenaOrgHandler
		// 	]

		// 	return reduce(handlers, (cards, handler) => {
		// 		if (handler.filter(p)) {
		// 			cards.push(..handler.transform(p))
		// 		}
		// 	}, [])
		// }

		// Basically JSON patch
		// REconfix
		// Based on Schema

		// Research Cue
		// https://cuelang.org/
		//
		// Research reconfix
		// Research Migrations
		// https://docs.google.com/document/d/1q5ZY3EnW_kfex2K28xt83482jhVfgsEIKpl_QyVKqIg/edit#heading=h.wrggxmyycvkr

		if (payload.payload.ip) {
			const location = geoip.lookup(payload.payload.ip)
			if (location) {
				updateProperty(
					card,
					[ 'data', 'profile', 'city' ],
					location.city,
					updateOptions
				)
				updateProperty(
					card,
					[ 'data', 'profile', 'country' ],
					location.country,
					updateOptions
				)
			}
		}
	}

	if (payload.targetCard === 'account') {
		//
		// id: 43,
		// name: "yawn",
		// company_name: null,
		// internal_company_name: null,
		// billing_account_code: null,
		// __metadata: { uri: "/resin/organization(@id)?@id=43" },
		// username: "yawn",

		updateProperty(
			card, [ 'name' ],
			payload.payload.name,
			updateOptions
		)

		updateProperty(
			card,
			[ 'data', 'company_name' ],
			payload.payload.company_name,
			updateOptions
		)

		updateProperty(
			card,
			[ 'data', 'internal_company_name' ],
			payload.payload.internal_company_name,
			updateOptions
		)

		updateProperty(
			card,
			[ 'data', 'billing_account_code' ],
			payload.payload.billing_account_code,
			updateOptions
		)
	}

	return card
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

	// https://www.flowdock.com/app/rulemotion/p-cyclops/threads/VmaFsGFZaAU1sCoVIeyuAbVBx3T
	// const type = payload.targetCard

	// &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& supply SLUG when creating account
	// Create issue for conencting Jellyfish with Balena
	// Mirror Messages link threads
	// Lots of duplicated syncing code with check

	// UnifiesProfiles checks if the existing card is equal to an already created card.

	async translate (event) {
		// Table of contents
		// 1. Decrypt event payload
		// 2. Ignore empty or useless payloads
		// 3. Get pre-existing card
		// 4. Initialize base card object
		// 5. Merge card with payload
		// 			1. Update or created value
		// 			2. If ip get adress and set adress data to payload
		// 			3. have fallback ready if it fails ???
		// 6. Set Actor of translate event
		// 7. build up translate sequence
		//
		//
		//
		//
		// 1. Decrypt event payload
		this.context.log.info('Balena-API Translate: 1. Decrypt event payload')

		const payload = await decryptPayload(
			this.options.token,
			event.data.payload
		)

		// 2. Ignore empty or useless payloads
		this.context.log.info(
			'Balena-API Translate: 2. Ignore empty or useless payloads', {
				payload
			}
		)

		// Return early when payload is empty
		if (!payload) return []

		// Ignore create events with no usefull information
		if (payload.type === 'create') {
			// If payload doesn't contain the username
			// we can ignore this update event
			if (userCreateContainsUsername(payload) === false) {
				this.context.log.info('Balena-API Translate: Create event doesn\'t contain username, ignoring translate event')
				return []
			}
		}

		this.context.log.info(`Balena-API Translate: Translating Balena ${payload.resource} => Jellyfish ${payload.targetCard}`)

		// 3. Get pre-existing card
		this.context.log.info('Balena-API Translate: 3. Get pre-existing card')

		const preExistingCard = await getPreExistingCard(payload, this.context)

		// 4. Initialize base card object
		this.context.log.info(
			'Balena-API Translate: 4. Initialize base card object'
		)

		const card = setCard(payload, preExistingCard, this.context)

		// 5. Merge card with payload
		this.context.log.info('Balena-API Translate: 5. Merge card with payload')

		const mergedCard = await mergedCardWithPayload(card, payload)

		// 6. Set Actor of translate event
		this.context.log.info(
			'Balena-API Translate: 6. Set Actor of translate event'
		)

		// The Balena API doesn't emit actors in events, so most
		// of them will be done by the admin user.
		const actor = await this.context.getActorId({
			handle: this.options.defaultUser
		})

		// 7. build up translate sequence
		this.context.log.info(
			'Balena-API Translate: 7. build up translate sequence'
		)
		const sequence = buildSquence(mergedCard, payload, actor)

		this.context.log.info(
			'Balena-API Translate: Returning Balena API updates',
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

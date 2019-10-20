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
const assert = require('../../assert')

const getMirrorId = (baseUrl, id) => {
	return `${baseUrl}/v5/user(${id})`
}

const slugify = (string) => {
	return string
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
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
			await this.context.getElementByMirrorId('user', mirrorId)

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
			`No username: ${JSON.stringify(payload, null, 2)}`)

		const sequence = []
		const slug = `user-${slugify(payload.payload.username)}`
		const userCard = await this.context.getElementBySlug(`${slug}@latest`)
		const unifiesProfiles = mirrorIdUserCard &&
			userCard &&
			mirrorIdUserCard.slug !== userCard.slug

		const defaultCard = unifiesProfiles ? mirrorIdUserCard : null
		const match = userCard || mirrorIdUserCard || {
			slug,
			type: 'user',
			tags: [],
			links: {},
			markers: [],
			active: true,
			data: {
				roles: [ 'user-community' ]
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
			updateProperty(match,
				[ 'data', 'profile', 'city' ],
				location.city, updateOptions)
			updateProperty(match,
				[ 'data', 'profile', 'country' ],
				location.country, updateOptions)
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

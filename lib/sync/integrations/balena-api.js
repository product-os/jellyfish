/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const crypto = require('crypto')

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
		// Not supported yet
		if (event.data.payload.resource !== 'user') {
			return []
		}

		const baseUrl = `https://${event.data.payload.source}`
		const mirrorId = getMirrorId(baseUrl, event.data.payload.payload.id)
		const mirrorIdUserCard =
			await this.context.getElementByMirrorId('user', mirrorId)

		// The Balena API doesn't emit actors in events, so most
		// of them will be done by the admin user.
		const adminActorId = await this.context.getActorId('user', 'admin')
		if (!adminActorId) {
			throw new this.options.errors.SyncNoActor(
				'Not such actor: admin')
		}

		const sequence = []
		const slug = `user-${event.data.payload.payload.username}`
		const userCard = await this.context.getElementBySlug(
			'user', slug)
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
				roles: [ 'user-community' ],
				disallowLogin: true
			}
		}

		match.data.mirrors = (match.data.mirrors || []).filter((mirror) => {
			return !mirror.startsWith(baseUrl)
		})

		if (event.data.payload.type === 'delete') {
			match.active = false
		} else {
			match.data.mirrors.push(mirrorId)
		}

		const currentEmail =
			(mirrorIdUserCard && userCard && mirrorIdUserCard.slug === userCard.slug)
				? null
				: match.data.email
		const email = event.data.payload.payload.email || currentEmail

		const updateOptions = {
			upsert: unifiesProfiles,
			fallback: defaultCard
		}

		updateProperty(match,
			[ 'data', 'email' ], email || 'new@change.me', updateOptions)
		updateProperty(match,
			[ 'data', 'profile', 'company' ],
			event.data.payload.payload.company, updateOptions)
		updateProperty(match,
			[ 'data', 'profile', 'name', 'first' ],
			event.data.payload.payload.first_name, updateOptions)
		updateProperty(match,
			[ 'data', 'profile', 'name', 'last' ],
			event.data.payload.payload.last_name, updateOptions)

		if (!match.data.translateDate ||
			new Date(event.data.payload.timestamp) > new Date(match.data.translateDate)) {
			match.data.translateDate =
				new Date(event.data.payload.timestamp).toISOString()

			sequence.push({
				time: new Date(event.data.payload.timestamp),
				actor: adminActorId,
				card: match
			})
		}

		if (unifiesProfiles) {
			mirrorIdUserCard.data.mirrors =
				_.without(mirrorIdUserCard.data.mirrors, mirrorId)
			mirrorIdUserCard.data.translateDate =
				new Date(event.data.payload.timestamp).toISOString()
			mirrorIdUserCard.active = false

			sequence.push({
				time: new Date(event.data.payload.timestamp),
				actor: adminActorId,
				card: mirrorIdUserCard
			})
		}

		return sequence
	}
}

module.exports.isEventValid = (token, rawEvent, headers) => {
	const signature = headers['x-balena-signature']
	if (!signature || !token || !token.signature) {
		return false
	}

	const hash = crypto.createHmac('sha1', token.signature)
		.update(rawEvent)
		.digest('hex')

	return signature === `sha1=${hash}`
}

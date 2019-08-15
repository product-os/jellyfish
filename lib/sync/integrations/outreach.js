/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const assert = require('../../assert')

const MAX_NAME_LENGTH = 50

const USER_PROSPECT_MAPPING = [
	{
		prospect: [ 'addressCity' ],
		user: [ 'data', 'profile', 'city' ]
	},
	{
		prospect: [ 'addressCountry' ],
		user: [ 'data', 'profile', 'country' ]
	},
	{
		prospect: [ 'title' ],
		user: [ 'data', 'profile', 'title' ]
	},
	{
		prospect: [ 'firstName' ],
		user: [ 'data', 'profile', 'name', 'first' ],
		fn: (value) => {
			return _.truncate(value, {
				length: MAX_NAME_LENGTH
			})
		}
	},
	{
		prospect: [ 'lastName' ],
		user: [ 'data', 'profile', 'name', 'last' ],
		fn: (value) => {
			return _.truncate(value, {
				length: MAX_NAME_LENGTH
			})
		}
	},
	{
		prospect: [ 'tags' ],
		user: [ 'tags' ]
	}
]

// TODO: Create an account for each company we know about
// if it doesn't already exist, and associate the prospect
// with the right company resource.
const getProspectAttributes = (contact) => {
	const githubUsername = contact.slug.startsWith('contact-gh-')
		? contact.slug.replace(/^contact-gh-/g, '')
		: null

	const attributes = {
		// As we may still have users around with these
		// auto-generated emails that Outreach doesn't
		// like as it claims they were taken already.
		emails: [ contact.data.profile && contact.data.profile.email ].filter((email) => {
			return email && !email.endsWith('@change.me')
		}),

		githubUsername,
		nickname: contact.slug.replace(/^contact-/g, ''),
		custom1: `https://jel.ly.fish/${contact.id}`
	}

	for (const mapping of USER_PROSPECT_MAPPING) {
		const value = _.get(contact, mapping.user)
		const fn = mapping.fn || _.identity
		_.set(attributes, mapping.prospect, fn(value))
	}

	return attributes
}

const getProspectByEmail = async (context, actor, errors, baseUrl, email) => {
	if (!email) {
		return null
	}

	const searchResult = await context.request(actor, {
		method: 'GET',
		json: true,
		uri: `${baseUrl}/api/v2/prospects`,
		qs: {
			'filter[emails]': email
		}
	}).catch((error) => {
		if (error.expected && error.name === 'SyncOAuthNoUserError') {
			return null
		}

		throw error
	})

	if (!searchResult) {
		return null
	}

	assert.INTERNAL(null, searchResult.code === 200,
		errors.SyncExternalRequestError,
		`Cannot find prospect by email ${email}: ${searchResult.code}`)

	return _.first(searchResult.body.data)
}

const upsertProspect = async (context, actor, errors, baseUrl, card) => {
	const contactEmail = card.data.profile && card.data.profile.email
	const prospect = await getProspectByEmail(
		context, actor, errors, baseUrl, contactEmail)

	const outreachUrl = _.find(card.data.mirrors, (mirror) => {
		return _.startsWith(mirror, baseUrl)
	}) || _.get(prospect, [ 'links', 'self' ])

	const method = outreachUrl ? 'PATCH' : 'POST'
	const uri = outreachUrl || `${baseUrl}/api/v2/prospects`

	context.log.info('Mirroring', {
		url: uri,
		remote: card
	})

	const body = {
		data: {
			type: 'prospect',
			attributes: getProspectAttributes(card)
		}
	}

	if (outreachUrl) {
		body.data.id = _.parseInt(_.last(outreachUrl.split('/')))
	}

	const result = await context.request(actor, {
		method,
		json: true,
		uri,
		body
	}).catch((error) => {
		if (error.expected && error.name === 'SyncOAuthNoUserError') {
			return null
		}

		throw error
	})

	if (!result) {
		return []
	}

	// This usually means that the email's domain belongs
	// to the company managing the Outreach account.
	if (result.code === 422 &&
		result.body.errors[0] &&
		result.body.errors[0].id === 'validationError' &&
		result.body.errors[0].detail ===
			'Contacts contact is using an excluded email address.') {
		context.log.info('Omitting excluded prospect by email address', {
			prospect: card,
			url: outreachUrl
		})

		return []
	}

	// When creating prospect, we first ask Outreach if it knows about an
	// email address in order decide if we have to insert or update.
	// If there are multiple requests coming in at the same time, one
	// may create the prospect after the other process asked Outreach about
	// it, causing a race condition where a prospect will be inserted twice,
	// resulting in an "already taken" error.
	if (result.code === 422 &&
		result.body.errors[0] &&
		result.body.errors[0].id === 'validationError' &&
		result.body.errors[0].detail ===
			'Contacts email hash has already been taken.') {
		context.log.info('Retrying taken address', {
			prospect: card,
			url: outreachUrl
		})

		return upsertProspect(context, actor, errors, baseUrl, card)
	}

	if (outreachUrl) {
		const summary = [
			`Got ${result.code} ${JSON.stringify(result.body, null, 2)}`,
			`when sending ${JSON.stringify(body, null, 2)} to ${outreachUrl}`
		].join('\n')
		assert.INTERNAL(null, result.code === 200,
			errors.SyncExternalRequestError,
			`Could not update prospect: ${summary}`)

		context.log.info('Updated prospect', {
			contacts: card,
			url: outreachUrl,
			data: result.body
		})

		if (!card.data.mirrors || !card.data.mirrors.includes(outreachUrl)) {
			card.data.mirrors = card.data.mirrors || []
			card.data.mirrors.push(outreachUrl)
			for (const mapping of USER_PROSPECT_MAPPING) {
				const prospectProperty =
					_.get(prospect.attributes, mapping.prospect)
				if (prospectProperty && !_.get(card, mapping.user)) {
					_.set(card, mapping.user, prospectProperty)
				}
			}

			context.log.info('Adding missing mirror url', {
				slug: card.slug,
				url: outreachUrl
			})

			return [
				{
					time: new Date(),
					actor,
					card
				}
			]
		}

		return []
	}

	const summary = [
		`Got ${result.code} ${JSON.stringify(result.body, null, 2)}`,
		`when sending ${JSON.stringify(body, null, 2)} to ${outreachUrl}`
	].join('\n')
	assert.INTERNAL(null, result.code === 201,
		errors.SyncExternalRequestError,
		`Could not create prospect: ${summary}`)

	card.data.mirrors = card.data.mirrors || []
	card.data.mirrors.push(result.body.data.links.self)

	context.log.info('Created prospect', {
		contact: card,
		url: outreachUrl,
		data: result.body
	})

	return [
		{
			time: new Date(),
			actor,
			card
		}
	]
}

const getSequenceCard = (url, attributes, options) => {
	return {
		name: attributes.name,
		tags: [],
		links: {},
		markers: [],
		active: options.active,
		type: 'email-sequence',
		slug: `email-sequence-${options.orgId}-${options.id}`,
		data: {
			translateDate: options.translateDate.toISOString(),
			mirrors: [ url ]
		}
	}
}

module.exports = class OutreachIntegration {
	constructor (options) {
		this.options = options
		this.context = this.options.context
		this.baseUrl = 'https://api.outreach.io'
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
		if (card.type !== 'contact') {
			return []
		}

		if (!this.options.token.appId || !this.options.token.appSecret) {
			return []
		}

		return upsertProspect(
			this.context, options.actor, this.options.errors, this.baseUrl, card)
	}

	async translate (event) {
		if (!this.options.token.appId || !this.options.token.appSecret) {
			return []
		}

		const data = event.data.payload.data
		const orgId = event.data.headers['outreach-org-id']

		// Lets only translate sequences for now
		if (data.type !== 'sequence') {
			return []
		}

		// A no-op update
		if (_.isEmpty(data.attributes)) {
			return []
		}

		const eventType = event.data.payload.meta.eventName

		// The Balena API doesn't emit actors in events, so most
		// of them will be done by the admin user.
		const adminActorId = await this.context.getActorId({
			handle: this.options.defaultUser
		})

		assert.INTERNAL(null, adminActorId,
			this.options.errors.SyncNoActor,
			`Not such actor: ${this.options.defaultUser}`)

		const url = `https://api.outreach.io/api/v2/sequences/${data.id}`
		const eventCard =
			await this.context.getElementByMirrorId('email-sequence', url)

		if (eventCard) {
			data.attributes.name = data.attributes.name || eventCard.name
		}

		if (eventType === 'sequence.updated' && !eventCard) {
			const remoteSequence = await this.context.request(adminActorId, {
				method: 'GET',
				json: true,
				uri: url
			}).catch((error) => {
				if (error.expected && error.name === 'SyncOAuthNoUserError') {
					return null
				}

				throw error
			})

			if (!remoteSequence) {
				return []
			}

			assert.INTERNAL(null, remoteSequence.code === 200,
				this.options.errors.SyncExternalRequestError,
				`Could not get sequence from ${url}: ${JSON.stringify(remoteSequence, null, 2)}`)

			data.attributes.name = data.attributes.name ||
				remoteSequence.body.data.attributes.name
			data.attributes.shareType = data.attributes.shareType ||
				remoteSequence.body.data.attributes.shareType
		}

		const isPublic =
			data.attributes.shareType === 'shared' || _.isNil(data.attributes.shareType)

		const sequenceCard = getSequenceCard(url, data.attributes, {
			id: data.id,
			active: eventType !== 'sequence.destroyed' && isPublic,
			translateDate: new Date(event.data.payload.meta.deliveredAt),
			orgId
		})

		if (eventCard && eventCard.data.translateDate) {
			if (new Date(eventCard.data.translateDate) >=
				new Date(sequenceCard.data.translateDate)) {
				return []
			}
		}

		const updateTimestamp = data.attributes.updatedAt &&
			data.attributes.updatedAt !== data.attributes.createdAt
			? data.attributes.updatedAt
			: event.data.payload.meta.deliveredAt

		const date = eventType === 'sequence.created'
			? new Date(data.attributes.createdAt)
			: new Date(updateTimestamp)

		return [
			{
				time: date,
				actor: adminActorId,
				card: sequenceCard
			}
		]
	}
}

module.exports.OAUTH_BASE_URL = 'https://api.outreach.io'
module.exports.OAUTH_SCOPES = [
	'prospects.all',
	'sequences.all',
	'sequenceStates.all',
	'sequenceSteps.all',
	'sequenceTemplates.all',
	'mailboxes.all',
	'webhooks.all'
]

// Don't take any external webhooks yet
module.exports.isEventValid = _.constant(false)

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const assert = require('../../assert')

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
		user: [ 'data', 'profile', 'name', 'first' ]
	},
	{
		prospect: [ 'lastName' ],
		user: [ 'data', 'profile', 'name', 'last' ]
	},
	{
		prospect: [ 'tags' ],
		user: [ 'tags' ]
	}
]

// TODO: Create an account for each company we know about
// if it doesn't already exist, and associate the prospect
// with the right company resource.
const getProspectAttributes = (user) => {
	const githubUsername = user.slug.startsWith('user-gh-')
		? user.slug.replace(/^user-gh-/g, '')
		: null

	const attributes = {
		// As we may still have users around with these
		// auto-generated emails that Outreach doesn't
		// like as it claims they were taken already.
		emails: [ user.data.email ].filter((email) => {
			return !email.endsWith('@change.me')
		}),

		githubUsername,
		nickname: user.slug.replace(/^user-/g, '')
	}

	for (const mapping of USER_PROSPECT_MAPPING) {
		_.set(attributes, mapping.prospect, _.get(user, mapping.user))
	}

	return attributes
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
		if (card.type !== 'user') {
			return []
		}

		if (!this.options.token.appId || !this.options.token.appSecret) {
			return []
		}

		const searchResult = card.data.email
			? await this.context.request(options.actor, {
				method: 'GET',
				json: true,
				uri: `${this.baseUrl}/api/v2/prospects`,
				qs: {
					'filter[emails]': card.data.email
				}
			}).catch((error) => {
				if (error.expected && error.name === 'SyncOAuthNoUserError') {
					return null
				}

				throw error
			})
			: null

		if (!searchResult) {
			return []
		}

		assert.INTERNAL(null, searchResult.code === 200,
			this.options.errors.SyncExternalRequestError,
			`Cannot find prospect by email ${card.data.email}: ${searchResult.code}`)

		const outreachUrl = _.find(card.data.mirrors, (mirror) => {
			return _.startsWith(mirror, this.baseUrl)
		}) || _.get(_.first(searchResult.body.data), [ 'links', 'self' ])

		this.context.log.info('Mirroring', {
			url: outreachUrl,
			remote: card
		})

		const method = outreachUrl ? 'PATCH' : 'POST'
		const uri = outreachUrl || `${this.baseUrl}/api/v2/prospects`

		const body = {
			data: {
				type: 'prospect',
				attributes: getProspectAttributes(card)
			}
		}

		if (outreachUrl) {
			body.data.id = _.parseInt(_.last(outreachUrl.split('/')))
		}

		const result = await this.context.request(options.actor, {
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

		// TODO: Validate HTTP response codes. For now we leave it
		// as it is in order to test it production without bringing
		// everything down if we expect the incorrect code.

		if (outreachUrl) {
			const summary = [
				`Got ${result.code} ${JSON.stringify(result.body, null, 2)}`,
				`when sending ${JSON.stringify(body, null, 2)} to ${outreachUrl}`
			].join('\n')
			assert.INTERNAL(null, result.code === 200,
				this.options.errors.SyncExternalRequestError,
				`Could not update prospect: ${summary}`)

			this.context.log.info('Updated prospect', {
				user: card,
				url: outreachUrl,
				data: result.body
			})

			if (!card.data.mirrors || !card.data.mirrors.includes(outreachUrl)) {
				card.data.mirrors = card.data.mirrors || []
				card.data.mirrors.push(outreachUrl)

				const existingProspect = searchResult.body.data[0]
				if (existingProspect) {
					for (const mapping of USER_PROSPECT_MAPPING) {
						const prospectProperty =
							_.get(existingProspect.attributes, mapping.prospect)
						if (prospectProperty && !_.get(card, mapping.user)) {
							_.set(card, mapping.user, prospectProperty)
						}
					}
				}

				this.context.log.info('Adding missing mirror url', {
					slug: card.slug,
					url: outreachUrl
				})

				return [
					{
						time: new Date(),
						actor: options.actor,
						card
					}
				]
			}
		} else {
			// This usually means that the email's domain belongs
			// to the company managing the Outreach account.
			if (result.code === 422 &&
				result.body.errors[0] &&
				result.body.errors[0].id === 'validationError' &&
				result.body.errors[0].detail ===
					'Contacts contact is using an excluded email address.') {
				this.context.log.info('Omitting excluded prospect by email address', {
					prospect: card
				})
				return []
			}

			const summary = [
				`Got ${result.code} ${JSON.stringify(result.body, null, 2)}`,
				`when sending ${JSON.stringify(body, null, 2)} to ${outreachUrl}`
			].join('\n')
			assert.INTERNAL(null, result.code === 201,
				this.options.errors.SyncExternalRequestError,
				`Could not create prospect: ${summary}`)

			card.data.mirrors = card.data.mirrors || []
			card.data.mirrors.push(result.body.data.links.self)

			this.context.log.info('Created prospect', {
				user: card,
				url: outreachUrl,
				data: result.body
			})

			return [
				{
					time: new Date(),
					actor: options.actor,
					card
				}
			]
		}

		return []
	}

	// eslint-disable-next-line class-methods-use-this
	async translate (event) {
		return []
	}
}

module.exports.OAUTH_BASE_URL = 'https://api.outreach.io'
module.exports.OAUTH_SCOPES = [ 'prospects.all' ]

// Don't take any external webhooks yet
module.exports.isEventValid = _.constant(false)

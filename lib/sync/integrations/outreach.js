/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const errio = require('errio')
const Bluebird = require('bluebird')

// TODO: Create an account for each company we know about
// if it doesn't already exist, and associate the prospect
// with the right company resource.
const getProspect = (user) => {
	const githubUsername = user.slug.startsWith('user-gh-')
		? user.slug.replace(/^user-gh-/g, '')
		: null

	const profile = user.data.profile || {}
	const name = profile.name || {}

	return {
		addressCity: profile.city,
		addressCountry: profile.country,

		// TODO: Just to check if Outreach complains if the
		// prospects have no e-mail.
		emails: [ user.data.email ].filter((email) => {
			return email !== 'unknown@change.me' && email !== 'new@change.me'
		}),

		firstName: name.first,
		lastName: name.last,
		title: profile.title,
		githubUsername,
		nickname: user.slug.replace(/^user-/g, ''),
		tags: user.tags
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
		if (card.type !== 'user') {
			return []
		}

		const outreachUrl = _.find(card.data.mirrors, (mirror) => {
			return _.startsWith(mirror, this.baseUrl)
		})

		this.context.log.info('Mirroring', {
			url: outreachUrl,
			remote: card
		})

		const method = outreachUrl ? 'PATCH' : 'POST'
		const uri = outreachUrl || `${this.baseUrl}/api/v2/prospects`

		const body = {
			data: {
				type: 'prospect',
				attributes: getProspect(card)
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
			if (error.expected && error.name === 'SyncOAuthError') {
				this.context.log.warn('Could not update prospect', {
					uri,
					method,
					body,
					error: errio.toObject(error, {
						stack: true
					})
				})

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
			this.context.log.info('Updating prospect', {
				url: outreachUrl,
				status: result.code,
				response: result.body,
				body,
				method
			})
		} else {
			this.context.log.info('Creating prospect', {
				status: result.code,
				response: result.body,
				body,
				method
			})

			// This usually means that the email's domain belongs
			// to the company managing the Outreach account.
			if (result.code === 422 &&
				result.body.errors[0] &&
				result.body.errors[0].title === 'Validation Error' &&
				result.body.errors[0].detail === 'Contacts contact is using an excluded email address.') {
				return []
			}

			if (result.code === 201) {
				card.data.mirrors = card.data.mirrors || []
				card.data.mirrors.push(result.body.data.links.self)

				return [
					{
						time: new Date(),
						actor: options.actor,
						card
					}
				]
			}

			// TODO: Handle errors
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

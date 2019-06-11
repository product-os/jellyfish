/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const request = require('request')
const errors = require('./errors')
const oauth = require('./oauth')
const assert = require('../assert')

const httpRequest = async (options) => {
	return new Bluebird((resolve, reject) => {
		request(options, (error, response, body) => {
			if (error) {
				return reject(error)
			}

			return resolve({
				code: response.statusCode,
				body
			})
		})
	})
}

const setProperty = (card, object, path) => {
	if (_.has(object, path)) {
		_.set(card, path, _.get(object, path) || _.get(card, path))
	}
}

const getOrCreate = async (context, object) => {
	// TODO: Attempt to unify user cards based on
	// their e-mails. i.e. if two user cards have
	// the same e-mail then they are likely the
	// same user.
	const card = await context.getElementBySlug(
		object.type, object.slug)
	if (card) {
		setProperty(card, object, [ 'data', 'email' ])
		setProperty(card, object, [ 'data', 'profile', 'company' ])
		setProperty(card, object, [ 'data', 'profile', 'name', 'first' ])
		setProperty(card, object, [ 'data', 'profile', 'name', 'last' ])
		setProperty(card, object, [ 'data', 'profile', 'title' ])
		setProperty(card, object, [ 'data', 'profile', 'country' ])
		setProperty(card, object, [ 'data', 'profile', 'city' ])

		await context.upsertElement(
			card.type, _.omit(card, [ 'type' ]), {
				timestamp: new Date()
			})

		return card.id
	}

	object.data.email = object.data.email || 'unknown@change.me'
	const result = await context.upsertElement(
		object.type, _.omit(object, [ 'type' ]), {
			timestamp: new Date()
		})

	// The result of an upsert might be null if the upsert
	// didn't change anything (a no-op update), so in that
	// case we can fetch the user card from the database.
	if (!result) {
		const existentCard = await context.getElementBySlug(
			object.type, object.slug)
		if (!existentCard) {
			return null
		}

		return existentCard.id
	}

	return result.id
}

const getOAuthUser = async (context, provider, actor, options) => {
	const userCard = await context.getElementById('user', actor)
	assert.INTERNAL(null, userCard,
		errors.SyncNoActor, `No such actor: ${actor}`)

	const tokenPath = [ 'data', 'oauth', provider ]
	if (_.has(userCard, tokenPath)) {
		return userCard
	}

	assert.INTERNAL(null, options.defaultUser,
		errors.SyncOAuthError,
		`No default integrations actor to act as ${actor} for ${provider}`)

	const defaultUserCard = await context.getElementBySlug(
		'user', `user-${options.defaultUser}`)

	assert.INTERNAL(null, defaultUserCard,
		errors.SyncNoActor, `No such actor: ${options.defaultUser}`)
	assert.INTERNAL(null, _.has(defaultUserCard, tokenPath),
		errors.SyncOAuthError,
		`Actor ${options.defaultUser} does not support ${provider}`)

	return defaultUserCard
}

exports.run = async (integration, token, fn, options) => {
	const getUsername = options.context.getUsername || _.identity

	// eslint-disable-next-line new-cap
	const instance = new integration({
		errors,
		token,
		defaultUser: options.defaultUser,
		context: {
			log: options.context.log,
			getElementBySlug: options.context.getElementBySlug,
			getElementById: options.context.getElementById,
			getElementByMirrorId: options.context.getElementByMirrorId,
			request: async (actor, requestOptions) => {
				assert.INTERNAL(null, actor,
					errors.SyncNoActor, 'Missing request actor')

				if (!integration.OAUTH_BASE_URL || !token.appId || !token.appSecret) {
					return httpRequest(requestOptions)
				}

				assert.INTERNAL(null, options.origin,
					errors.SyncOAuthError, 'Missing OAuth origin URL')

				const userCard = await getOAuthUser(
					options.context, options.provider, actor, {
						defaultUser: options.defaultUser
					})

				const tokenPath = [ 'data', 'oauth', options.provider ]
				const tokenData = _.get(userCard, tokenPath)
				if (tokenData) {
					_.set(requestOptions, [
						'headers',
						'Authorization'
					], `Bearer ${tokenData.access_token}`)
				}

				const result = await httpRequest(requestOptions)

				// Lets try refreshing the token and retry if so
				if (result.code === 401 && tokenData) {
					options.context.log.info('Refreshing OAuth token', {
						provider: options.provider,
						user: userCard.slug,
						origin: options.origin,
						appId: token.appId,
						oldToken: tokenData.access_token
					})

					/*
					 * Keep in mind that there exists the possibility
					 * that we refresh the token on the provider's API
					 * but we fail to save the result to the user's
					 * card, in which case the user will need to re-link
					 * his account.
					 */
					const newToken = await oauth.refreshAccessToken(
						integration.OAUTH_BASE_URL, tokenData, {
							appId: token.appId,
							appSecret: token.appSecret,
							redirectUri: options.origin
						})
					_.set(userCard, tokenPath, newToken)
					await options.context.upsertElement(
						userCard.type, _.omit(userCard, [ 'type' ]), {
							timestamp: new Date()
						})

					_.set(requestOptions, [
						'headers',
						'Authorization'
					], `Bearer ${newToken.access_token}`)

					return httpRequest(requestOptions)
				}

				return result
			},
			getActorId: async (information) => {
				const username = information.handle || information.email
				const translatedUsername = await getUsername(username)
				const slug = translatedUsername
					.toLowerCase()
					.replace(/[^a-z0-9-]/g, '-')

				const profile = {}

				if (information.title) {
					profile.title = information.title
				}

				if (information.company) {
					profile.company = information.company
				}

				if (information.country) {
					profile.country = information.country
				}

				if (information.city) {
					profile.city = information.city
				}

				const firstName = _.get(information, [ 'name', 'first' ])
				const lastName = _.get(information, [ 'name', 'last' ])
				if (firstName) {
					_.set(profile, [ 'name', 'first' ], firstName)
				}
				if (lastName) {
					_.set(profile, [ 'name', 'lastName' ], lastName)
				}

				return getOrCreate(options.context, {
					slug: `user-${slug}`,
					type: 'user',
					version: '1.0.0',
					data: {
						roles: [],
						email: information.email,
						profile
					}
				})
			}
		}
	})

	await instance.initialize()

	try {
		const result = await fn(instance)
		await instance.destroy()
		return result
	} catch (error) {
		await instance.destroy()
		throw error
	}
}

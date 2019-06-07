/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const request = require('request')
const errors = require('./errors')
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

const getOrCreate = async (context, object) => {
	const card = await context.getElementBySlug(object.type, object.slug)
	if (card) {
		return card.id
	}

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

exports.run = async (integration, token, fn, options) => {
	const getUsername = options.context.getUsername || _.identity

	// eslint-disable-next-line new-cap
	const instance = new integration({
		errors,
		token,
		context: {
			log: options.context.log,
			getElementBySlug: options.context.getElementBySlug,
			getElementById: options.context.getElementById,
			getElementByMirrorId: options.context.getElementByMirrorId,
			request: async (actor, requestOptions) => {
				assert.INTERNAL(options.context, actor,
					errors.SyncNoActor, 'Missing request actor')

				if (!integration.OAUTH_BASE_URL || !token.appId || !token.appSecret) {
					return httpRequest(requestOptions)
				}

				assert.INTERNAL(options.context, options.origin,
					errors.SyncOAuthError, 'Missing OAuth origin URL')

				// TODO: Make this function understand OAuth, and allow
				// it to re-fresh and update OAuth tokens from user cards
				// transparently to the integrations.
				return httpRequest(requestOptions)
			},
			getActorId: async (username) => {
				const translatedUsername = await getUsername(username)
				const slug = translatedUsername
					.toLowerCase()
					.replace(/[^a-z0-9-]/g, '-')

				return getOrCreate(options.context, {
					slug: `user-${slug}`,
					type: 'user',
					version: '1.0.0',
					data: {
						roles: [],
						email: translatedUsername.includes('@')
							? translatedUsername
							: 'new@change.me'
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

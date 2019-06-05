/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const request = require('request')
const errors = require('./errors')

// TODO: Make this function understand OAuth, and allow
// it to re-fresh and update OAuth tokens from user cards
// transparently to the integrations.
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

exports.run = async (integration, token, fn, options) => {
	// eslint-disable-next-line new-cap
	const instance = new integration({
		// Notice that integrations don't have access at all
		// to functions that insert/upsert to the data store
		context: {
			log: options.context.log,
			getElementBySlug: options.context.getElementBySlug,
			getElementById: options.context.getElementById,

			// TODO: Move most of the generic body of this function here
			getActorId: options.context.getActorId,

			getElementByMirrorId: options.context.getElementByMirrorId,
			request: httpRequest
		},

		errors,
		token
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

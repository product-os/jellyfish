/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const bcrypt = require('bcrypt')
const {
	PASSWORDLESS_USER_HASH,
	BCRYPT_SALT_ROUNDS
} = require('./constants')

const pre = async (session, context, request) => {
	const password = request.arguments.password

	if (!password) {
		return {
			...request.arguments,
			password: PASSWORDLESS_USER_HASH
		}
	}

	// Convert the plaintext password into a hash so that we don't have
	// a plain password stored in the DB
	request.arguments.password = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)

	return request.arguments
}

const handler = async (session, context, card, request) => {
	try {
		const result = await context.insertCard(context.privilegedSession, card, {
			timestamp: request.timestamp,
			actor: request.actor,
			originator: request.originator,
			attachEvents: true
		}, {
			slug: request.arguments.username,
			version: '1.0.0',
			data: {
				email: request.arguments.email,
				roles: [ 'user-community' ],
				hash: request.arguments.password
			}
		})

		if (!result) {
			return null
		}

		return {
			id: result.id,
			type: result.type,
			version: result.version,
			slug: result.slug
		}
	} catch (error) {
		if (error.name === 'JellyfishElementAlreadyExists' &&
			error.slug === request.arguments.username) {
			error.expected = true
		}

		throw error
	}
}

module.exports = {
	pre,
	handler
}

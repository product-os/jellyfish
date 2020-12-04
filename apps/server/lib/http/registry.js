/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const jsonwebtoken = require('jsonwebtoken')
const uuid = require('@balena/jellyfish-uuid')
const _ = require('lodash')
const Bluebird = require('bluebird')

const {
	REGISTRY_HOST,
	REGISTRY_TOKEN_AUTH_CERT_ISSUER,
	REGISTRY_TOKEN_AUTH_JWT_ALGO,
	REGISTRY_TOKEN_AUTH_CERT_KEY,
	REGISTRY_TOKEN_AUTH_CERT_KID

// eslint-disable-next-line no-process-env
} = process.env

// eslint-disable-next-line
const SCOPE_PARSE_REGEX = /^([a-z]+):([a-z0-9_-]*\/?[a-z0-9_-]+|\d+\/[\d\-]+|v2\/[a-z0-9]+-[0-9]+)(?::[a-z0-9]+|@sha256:[a-f0-9]+)?:((?:push|pull|,)+)$/

const b64decode = (str) => {
	return Buffer.from(str, 'base64').toString().trim()
}

const parseScope = (req, sc) => {
	if (!sc) {
		return null
	}

	const params = sc.match(SCOPE_PARSE_REGEX)

	if (params === null) {
		return null
	}

	if (params[1] !== 'repository') {
		return null
	}

	return [ params[1], params[2], params[3].split(',') ]
}

// This method allows a Docker registry to use Jellyfish for authentication
// using a JWT token.
// For the request to be authorized, the "account" parameter must be a valid jellyfish API
// token, and the name of the blob being operated on must correspond to
// a contract in Jellyfish that the API token can read.
// TODO: Deduplicate this code with https://github.com/balena-io/open-balena-api/blob/master/src/features/registry/registry.ts
exports.authenticate = async (request, response, jellyfish) => {
	// Respond with 'service unavailable' if we are not configured to provide
	// registry token auth
	if (
		!REGISTRY_HOST ||
		!REGISTRY_TOKEN_AUTH_CERT_ISSUER ||
		!REGISTRY_TOKEN_AUTH_CERT_KEY ||
		!REGISTRY_TOKEN_AUTH_CERT_KID ||
		!REGISTRY_TOKEN_AUTH_JWT_ALGO
	) {
		return response.status(503)
	}

	const {
		scope
	} = request.query

	let scopes = null

	if (typeof scope === 'string') {
		scopes = [ scope ]
	} else if (Array.isArray(scope)) {
		scopes = scope
	} else if (_.isObject(scope)) {
		scopes = Object.values(scope)
	} else {
		scopes = []
	}

	const parsedScopes = _.chain(scopes)
		.map((scop) => { return parseScope(request, scop) })
		.compact()
		.value()

	const payload = {
		jti: await uuid.random(),
		nbf: Math.floor(Date.now() / 1000) - 10,

		access: await Bluebird.map(parsedScopes, async ([ type, name, actions ]) => {
			const session = request.account

			// Name will refer to the id of the contract representing this entity
			const contract = await jellyfish.getCardById(session, name)

			return {
				type,
				name,
				actions: contract ? [ 'push', 'pull' ] : []
			}
		})
	}

	const jwtOptions = {
		algorithm: REGISTRY_TOKEN_AUTH_JWT_ALGO,
		issuer: REGISTRY_TOKEN_AUTH_CERT_ISSUER,
		audience: REGISTRY_HOST,
		subject: '',
		expiresIn: 60 * 240,
		header: {
			kid: b64decode(REGISTRY_TOKEN_AUTH_CERT_KID)
		}
	}

	return response.status(200).json({
		token: jsonwebtoken.sign(payload, b64decode(REGISTRY_TOKEN_AUTH_CERT_KEY), jwtOptions)
	})
}

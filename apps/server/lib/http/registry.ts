/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import jsonwebtoken from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import Bluebird from 'bluebird';
import { getLogger } from '@balena/jellyfish-logger';

const logger = getLogger(__filename);

const {
	REGISTRY_HOST,
	REGISTRY_TOKEN_AUTH_CERT_ISSUER,
	REGISTRY_TOKEN_AUTH_JWT_ALGO,
	REGISTRY_TOKEN_AUTH_CERT_KEY,
	REGISTRY_TOKEN_AUTH_CERT_KID,

	// eslint-disable-next-line no-process-env
} = process.env;

// eslint-disable-next-line
const SCOPE_PARSE_REGEX =
	/^([a-z]+):([a-z0-9_-]*\/?[a-z0-9_-]+|\d+\/[\d\-]+|v2\/[a-z0-9]+-[0-9]+)(?::[a-z0-9]+|@sha256:[a-f0-9]+)?:((?:push|pull|,)+)$/;

const b64decode = (str) => {
	return Buffer.from(str, 'base64').toString().trim();
};

const parseScope = (_req, sc) => {
	if (!sc) {
		return null;
	}

	const params = sc.match(SCOPE_PARSE_REGEX);

	if (params === null) {
		return null;
	}

	if (params[1] !== 'repository') {
		return null;
	}

	return [params[1], params[2], params[3].split(',')];
};

// This method allows a Docker registry to use Jellyfish for authentication
// using a JWT token.
// For the request to be authorized, the "account" parameter must be a valid jellyfish API
// token, and the name of the blob being operated on must correspond to
// a contract in Jellyfish that the API token can read.
// TODO: Deduplicate this code with https://github.com/balena-io/open-balena-api/blob/master/src/features/registry/registry.ts
export const authenticate = async (request, response, jellyfish) => {
	// Respond with 'service unavailable' if we are not configured to provide
	// registry token auth
	if (
		!REGISTRY_HOST ||
		!REGISTRY_TOKEN_AUTH_CERT_ISSUER ||
		!REGISTRY_TOKEN_AUTH_CERT_KEY ||
		!REGISTRY_TOKEN_AUTH_CERT_KID ||
		!REGISTRY_TOKEN_AUTH_JWT_ALGO
	) {
		logger.info(
			request.context,
			'Registry authentication unavailable due to missing env var(s)',
			{
				envvars: _.keys(
					_.pickBy(
						{
							REGISTRY_HOST,
							REGISTRY_TOKEN_AUTH_CERT_ISSUER,
							REGISTRY_TOKEN_AUTH_CERT_KEY,
							REGISTRY_TOKEN_AUTH_CERT_KID,
							REGISTRY_TOKEN_AUTH_JWT_ALGO,
						},
						(envvar) => {
							return !envvar;
						},
					),
				),
			},
		);
		return response.sendStatus(503);
	}

	let sessionToken: string | null = null;
	let actorSlug: string | null = null;
	try {
		// Get id and sessionToken from basic auth header
		[actorSlug, sessionToken] = b64decode(
			(request.headers.authorization || '').split(' ')[1] || '',
		).split(':');
		if (!actorSlug || !sessionToken) {
			logger.info(request.context, 'Session token missing');
			return response.status(400).send('session token missing');
		}

		// Retrieve actor card to verify the session
		// TODO figure out why we need the version on the slug here
		const actor = await jellyfish.getCardBySlug(
			request.context,
			sessionToken,
			`${actorSlug}@latest`,
		);
		if (!actor) {
			throw new Error('Unable to load actor');
		}

		// Retrieve session card
		const session = await jellyfish.getCardById(
			request.context,
			sessionToken,
			sessionToken,
		);
		if (!session || session.data.actor !== actor.id) {
			throw new Error('Invalid session');
		}
	} catch (error) {
		logger.info(
			request.context,
			'Registry authentication error validating session',
			{
				error,
			},
		);
		return response.status(401).send('session token invalid');
	}

	const { scope } = request.query;

	// As defined by https://docs.docker.com/registry/spec/auth/scope/
	let scopes: any = null;

	if (typeof scope === 'string') {
		scopes = [scope];
	} else if (Array.isArray(scope)) {
		scopes = scope;
	} else if (_.isObject(scope)) {
		scopes = Object.values(scope);
	} else {
		scopes = [];
	}

	const parsedScopes = _.chain(scopes)
		.map((scop) => {
			return parseScope(request, scop);
		})
		.compact()
		.value();

	const payload = {
		jti: uuidv4(),
		nbf: Math.floor(Date.now() / 1000) - 10,
		access: _.compact(
			await Bluebird.map(parsedScopes, async ([type, name, actions]) => {
				let contract = null;

				try {
					// Name will refer to the slug of the contract representing this entity.
					// The registry doesn't allow scopes per version - we assume that all versions
					// have the same permissions set
					contract = await jellyfish.getCardBySlug(
						request.context,
						sessionToken,
						`${name}@latest`,
					);
				} catch (error) {
					logger.info(
						request.context,
						'Registry authentication hit error querying for contract',
						{
							name,
						},
					);

					return null;
				}

				if (contract) {
					return {
						type,
						name,
						actions: _.intersection(actions, ['push', 'pull']),
					};
				}
				return null;
			}),
		),
	};

	logger.info(request.context, 'Registry authentication generating JWT', {
		access: payload.access,
	});

	const jwtOptions = {
		algorithm: REGISTRY_TOKEN_AUTH_JWT_ALGO,
		issuer: REGISTRY_TOKEN_AUTH_CERT_ISSUER,
		audience: REGISTRY_HOST,
		subject: '',
		expiresIn: 60 * 240,
		header: {
			kid: b64decode(REGISTRY_TOKEN_AUTH_CERT_KID),
		},
	};

	return response.status(200).json({
		token: jsonwebtoken.sign(
			payload,
			b64decode(REGISTRY_TOKEN_AUTH_CERT_KEY),
			jwtOptions as any,
		),
	});
};

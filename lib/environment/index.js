/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/**
 * @summary Check if the code is running in a production environment
 * @function
 * @public
 *
 * @returns {Boolean} Whether the environment is production
 *
 * @example
 * if (environment.isProduction()) {
 *   console.log('Production!')
 * }
 */
exports.isProduction = () => {
	return process.env.NODE_ENV === 'production'
}

/**
 * @summary Get the log level
 * @function
 * @public
 *
 * @returns {String} log level
 *
 * @example
 * console.log(environment.getLogLevel())
 */
exports.getLogLevel = () => {
	return process.env.LOGLEVEL || 'debug'
}

/**
 * @summary Get the token of an integration
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @returns {(Any|Null)} token
 *
 * @example
 * console.log(environment.getIntegrationToken('github'))
 */
exports.getIntegrationToken = (integration) => {
	if (integration === 'github') {
		const result = {
			api: process.env.INTEGRATION_GITHUB_TOKEN || null,
			signature: process.env.INTEGRATION_GITHUB_SIGNATURE_KEY || null
		}

		if (!result.api || !result.signature) {
			return null
		}

		return result
	}

	if (integration === 'front') {
		const result = {
			api: process.env.INTEGRATION_FRONT_TOKEN
		}

		if (!result.api) {
			return null
		}

		return result
	}

	return null
}

exports.getDatabaseConfiguration = () => {
	return {
		certificate: process.env.DB_CERT,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD || null,
		port: process.env.DB_PORT,
		host: process.env.DB_HOST,
		database: process.env.SERVER_DATABASE,
		buffer: process.env.RETHINKDB_MIN_POOL_SIZE,
		max: process.env.RETHINKDB_MAX_POOL_SIZE
	}
}

exports.getRedisConfiguration = () => {
	return {
		mock: false,
		namespace: process.env.REDIS_NAMESPACE,
		password: process.env.REDIS_PASSWORD || null,
		port: process.env.REDIS_PORT,
		host: process.env.REDIS_HOST
	}
}

exports.sentry = {
	server: {}
}

if (exports.isProduction()) {
	exports.sentry.server.dsn = process.env.SENTRY_DSN_SERVER
}

exports.logentries = {
	token: process.env.LOGENTRIES_TOKEN
}

exports.http = {
	port: process.env.PORT
}

exports.fileStorage = {
	driver: process.env.FS_DRIVER
}

exports.aws = {
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
}

exports.database = {
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	buffer: process.env.RETHINKDB_MIN_POOL_SIZE,
	max: process.env.RETHINKDB_MAX_POOL_SIZE
}

exports.redis = {
	disable: process.env.DISABLE_REDIS
}

exports.cache = {
	disable: process.env.DISABLE_CACHE
}

exports.flags = {
	visual: process.env.VISUAL
}

exports.integration = {
	github: {
		signatureKey: process.env.INTEGRATION_GITHUB_SIGNATURE_KEY
	}
}

exports.test = {
	integration: {
		github: {
			repo: process.env.TEST_INTEGRATION_GITHUB_REPO
		},
		front: {
			inbox: (process.env.TEST_INTEGRATION_FRONT_INBOX || '').trim()
		}
	},
	jellyfish: {
		user: process.env.JF_TEST_USER,
		password: process.env.JF_TEST_PASSWORD,
		url: process.env.JF_URL
	}
}

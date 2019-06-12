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

exports.logger = {
	loglevel: process.env.LOGLEVEL
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

exports.ui = {
	port: process.env.UI_PORT
}

exports.postgres = {
	user: process.env.POSTGRES_USER,
	password: process.env.POSTGRES_PASSWORD,
	database: process.env.POSTGRES_DATABASE,
	port: process.env.POSTGRES_PORT,
	host: process.env.POSTGRES_HOST
}

exports.database = {
	type: process.env.DATABASE
}

exports.database.options = exports[exports.database.type]

exports.fileStorage = {
	driver: process.env.FS_DRIVER
}

exports.lockfile = process.env.LOCKFILE

exports.aws = {
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
}

exports.redis = {
	disable: process.env.DISABLE_REDIS,
	mock: false,
	namespace: process.env.REDIS_NAMESPACE,
	password: process.env.REDIS_PASSWORD || null,
	port: process.env.REDIS_PORT,
	host: process.env.REDIS_HOST
}

if (!exports.redis.password) {
	Reflect.deleteProperty(exports.redis, 'password')
}

exports.cache = {
	disable: process.env.DISABLE_CACHE
}

exports.flags = {
	visual: process.env.VISUAL
}

exports.pod = {
	name: process.env.POD_NAME
}

exports.integration = {
	default: {
		user: process.env.INTEGRATION_DEFAULT_USER
	},
	'balena-api': {
		publicKey: process.env.INTEGRATION_BALENA_API_PUBLIC_KEY,
		privateKey: process.env.INTEGRATION_BALENA_API_PRIVATE_KEY
	},
	github: {
		api: process.env.INTEGRATION_GITHUB_TOKEN,
		signature: process.env.INTEGRATION_GITHUB_SIGNATURE_KEY
	},
	front: {
		api: process.env.INTEGRATION_FRONT_TOKEN,
		intercom: process.env.INTEGRATION_INTERCOM_TOKEN
	},
	discourse: {
		api: process.env.INTEGRATION_DISCOURSE_TOKEN,
		username: process.env.INTEGRATION_DISCOURSE_USERNAME,
		signature: process.env.INTEGRATION_DISCOURSE_SIGNATURE_KEY
	},
	outreach: {
		appId: process.env.INTEGRATION_OUTREACH_APP_ID,
		appSecret: process.env.INTEGRATION_OUTREACH_APP_SECRET
	}
}

exports.test = {
	integration: {
		github: {
			repo: process.env.TEST_INTEGRATION_GITHUB_REPO
		},
		front: {
			inboxes: [
				(process.env.TEST_INTEGRATION_FRONT_INBOX_1 || '').trim(),
				(process.env.TEST_INTEGRATION_FRONT_INBOX_2 || '').trim()
			]
		},
		discourse: {
			category: process.env.TEST_INTEGRATION_DISCOURSE_CATEGORY,
			username: process.env.TEST_INTEGRATION_DISCOURSE_USERNAME,
			nonModeratorUsername: process.env.TEST_INTEGRATION_DISCOURSE_NON_MODERATOR_USERNAME
		}
	},
	jellyfish: {
		user: process.env.JF_TEST_USER,
		password: process.env.JF_TEST_PASSWORD,
		url: process.env.JF_URL
	}
}

exports.oauth = {
	redirectBaseUrl: process.env.OAUTH_REDIRECT_BASE_URL
}

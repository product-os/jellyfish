/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global env */

export const isTest = () => {
	return env.NODE_ENV === 'test'
}

export const isProduction = () => {
	return env.NODE_ENV === 'production'
}

export const api = {
	prefix: env.API_PREFIX || 'api/v2',
	url: env.API_URL
}

export const analytics = {
	mixpanel: {
		token: env.MIXPANEL_TOKEN_CHAT_WIDGET
	}
}

export const sentry = {
	dsn: env.SENTRY_DSN_UI || '0'
}

export const version = env.VERSION || 'v1.0.0'

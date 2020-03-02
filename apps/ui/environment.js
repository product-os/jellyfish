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

export const sentry = {
	dsn: (typeof env === 'undefined') ? '0' : (env.SENTRY_DSN_UI || '0')
}

export const api = {
	prefix: (typeof env === 'undefined') ? 'api/v2' : (env.API_PREFIX || 'api/v2'),
	url: (typeof env === 'undefined' || typeof window === 'undefined') ? '' : (env.API_URL || window.location.origin)
}

export const analytics = {
	mixpanel: {
		token: (typeof env === 'undefined') ? '' : (env.MIXPANEL_TOKEN_UI || '')
	}
}

export const version = (typeof env === 'undefined') ? 'v1.0.0' : (env.VERSION || 'v1.0.0')

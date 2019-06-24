/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global process */
/* eslint-disable no-process-env */

export const isTest = () => {
	return process.env.NODE_ENV === 'test'
}

export const isProduction = () => {
	return process.env.NODE_ENV === 'production'
}

export const sentry = {
	dsn: process.env.SENTRY_DSN_UI || '0'
}

export const api = {
	prefix: process.env.API_PREFIX || 'api/v2',
	url: process.env.API_URL || window.location.origin
}

export const analytics = {
	mixpanel: {
		token: process.env.MIXPANEL_TOKEN_UI
	}
}

export const version = process.env.VERSION

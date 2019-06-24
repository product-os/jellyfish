/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import * as _ from 'lodash'
import mixpanel from 'mixpanel-browser'

export default class Analytics {
	constructor (config) {
		this.isInitialized = false
		this.skip = false
		const token = config.token
		if (token) {
			mixpanel.init(token, _.omit(config, 'token'))
		} else {
			console.warn('No token provided, skipping analytics setup')
			this.skip = true
		}
		this.isInitialized = true
	}

	track (event, metadata) {
		if (!this.isInitialized) {
			throw new Error('Analytics are not initialized')
		}
		if (this.skip) {
			return
		}
		mixpanel.track(event, metadata)
	}

	identify (id) {
		if (!this.isInitialized) {
			throw new Error('Analytics are not initialized')
		}
		if (this.skip) {
			return
		}
		mixpanel.identify(id)
	}
}

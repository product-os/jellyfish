/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as mixpanel from 'mixpanel-browser';

type TrackingEvent =
	'ui.login' |
	'ui.loginWithToken' |
	'ui.logout' |
	'ui.signup' |
	// When a new element is created
	'element.create' |
	// When an element is updated
	'element.update' |
	// When an element is viewed on its own
	'element.visit';

interface TrackingMetadata {
	element?: {
		type: string;
		id?: string;
	};
}

interface AnalyticsConfig {
	token?: string;
	[k: string]: any;
}

export class Analytics {
	isInitialized: boolean = false;
	skip: boolean = false;

	constructor(config: AnalyticsConfig) {
		const {
			token,
			..._config
		} = config;

		if (!token) {
			console.warn('No token provided, skipping analytics setup');
			this.skip = true;
		} else {
			mixpanel.init(token, _config);
		}

		this.isInitialized = true;
	}

	track(event: TrackingEvent, metadata?: TrackingMetadata): void {
		if (!this.isInitialized) {
			throw new Error('Analytics are not initialized');
		}

		if (this.skip) {
			return;
		}

		mixpanel.track(event, metadata);
	}

	identify(id?: string): void {
		if (!this.isInitialized) {
			throw new Error('Analytics are not initialized');
		}

		if (this.skip) {
			return;
		}

		mixpanel.identify(id);
	}
}

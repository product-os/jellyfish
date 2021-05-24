/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { Analytics, ErrorReporter } from '@balena/jellyfish-ui-components';
import * as environment from '../environment';
import { sdk as SDK } from './sdk';
import { setupStore } from './store';
import * as QUERIES from './queries';

export const sdk = SDK;
export const queries = QUERIES;

export const constants = {
	LINKS: sdk.LINKS,
};

export const analytics = new Analytics({
	token: environment.analytics.mixpanel.token,
});

export const errorReporter = new ErrorReporter({
	isProduction: environment.isProduction(),
	dsn: environment.sentry.dsn,
	version: environment.version,
});

const bundle = setupStore({
	analytics,
	errorReporter,
	sdk,
});

export const selectors = bundle.selectors;
export const store = bundle.store;
export const persistor = bundle.persistor;
export const actionCreators = bundle.actionCreators;

if (typeof window !== 'undefined') {
	(window as any).sdk = sdk;
}

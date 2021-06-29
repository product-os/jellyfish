/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// @ts-ignore
import * as browserEnv from 'browser-env';
browserEnv([
	'window',
	'document',
	'navigator',
	'XMLHttpRequest',
	'HTMLAnchorElement',
	'NodeFilter',
	'NodeList',
	'File',
	'Blob',
]);

const oldWindowLocation = window.location;
Reflect.deleteProperty(window, 'location');

(window.location as any) = Object.defineProperties(
	{},
	{
		...Object.getOwnPropertyDescriptors(oldWindowLocation),

		// Need to force the window location host value to be set to something sensible
		host: {
			configurable: true,
			value: 'localhost:9000',
		},
	},
);

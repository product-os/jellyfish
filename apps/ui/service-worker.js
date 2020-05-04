/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global env */

import 'workbox-sw'
import {
	clientsClaim
} from 'workbox-core'
import {
	precacheAndRoute
} from 'workbox-precaching'
import {
	registerRoute
} from 'workbox-routing'
import {
	CacheFirst
} from 'workbox-strategies'

// The clientsClaim method ensures that all uncontrolled clients (i.e. pages)
// that are within scope will be controlled by a service worker immediately
// after that service worker activates. If we don't enable it, then they
// won't be controlled until the next navigation.
clientsClaim()

// Listen for events of type 'SKIP_WAITING' and run the skipWaiting() method,
// forcing the service worker to activate right away.
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting()
	}
})

// Notes:
// 1. The JF_DEBUG_SW environment variable allows us to explicitly enable
// dev logs while in development mode.
// 2. __WB_DISABLE_DEV_LOGS defaults to true (disable logging).
// 3. __WB_DISABLE_DEV_LOGS is ignored if NODE_ENV === 'production'
const jfDebugSW = (env.JF_DEBUG_SW || '').toLowerCase()
// eslint-disable-next-line no-underscore-dangle
self.__WB_DISABLE_DEV_LOGS = jfDebugSW !== 'true' && jfDebugSW !== '1'

// Cache google font files
registerRoute(
	/^https:\/\/fonts\.(gstatic|googleapis)\.com/,
	new CacheFirst({
		cacheName: 'google-fonts-stylesheets'
	})
)

// Cache fontawesome font files
registerRoute(
	/^https:\/\/use\.fontawesome\.com/,
	new CacheFirst({
		cacheName: 'fontawesome-stylesheets'
	})
)

// eslint-disable-next-line no-underscore-dangle
precacheAndRoute(self.__WB_MANIFEST)

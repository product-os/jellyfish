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

self.addEventListener('push', (event) => {
	try {
		const payload = JSON.parse(event.data.text())
		const title = 'Jellyfish'
		const options = {
			icon: '/icons/jellyfish.png',
			body: payload.message || '',
			data: {
				url: payload.url || self.location.origin
			}
		}
		event.waitUntil(self.registration.showNotification(title, options))
	} catch (error) {
		console.error('Failed to handle web push notification', error)
	}
})

self.addEventListener('notificationclick', (event) => {
	try {
		event.notification.close()

		// Get all the Window clients
		event.waitUntil(self.clients.matchAll({
			type: 'window'
		}).then((clientsArr) => {
			// Check if there's a Window tab matching the targeted URL
			const matchingWindowClient = clientsArr.find((clientWindow) => {
				return clientWindow.url === event.notification.data.url
			})

			if (matchingWindowClient) {
				matchingWindowClient.focus()
			} else {
				// There's no window open to that URL so open a new tab to the applicable URL and focus it.
				self.clients
					.openWindow(event.notification.data.url)
					.then((windowClient) => (windowClient ? windowClient.focus() : null))
			}
		}))
	} catch (error) {
		console.error('Failed to handle notification click', error)
	}
})

// Notes:
// 1. The JF_DEBUG_SW environment variable allows us to explicitly enable
// dev logs while in development mode.
// 2. __WB_DISABLE_DEV_LOGS defaults to true (disable logging).
// 3. __WB_DISABLE_DEV_LOGS is ignored if NODE_ENV === 'production'
// eslint-disable-next-line no-underscore-dangle
self.__WB_DISABLE_DEV_LOGS = env.JF_DEBUG_SW !== '1'

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

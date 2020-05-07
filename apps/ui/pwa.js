/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Workbox
} from 'workbox-window'
import {
	pwa,
	isProduction
} from './environment'

const SERVICE_WORKER_URL = '/service-worker.js'

export default class PWA {
	constructor () {
		this.isInitialized = false
		this.wb = null
		this.registration = null
	}

	init () {
		if (this.isInitialized) {
			return
		}
		if (!isProduction() && !pwa.debugSW()) {
			console.log('Service Worker registration skipped. Set the JF_DEBUG_SW environment variable to override this.')
			return
		}
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				this.wb = new Workbox(SERVICE_WORKER_URL)

				// Fires when the registered service worker has installed but is waiting to activate.
				this.wb.addEventListener('waiting', (event) => {
					// eslint-disable-next-line no-alert
					if (window.confirm('New version of Jellyfish available. Update now?')) {
						// Set up a listener that will reload the page as soon as the previously waiting
						// service worker has taken control.
						this.wb.addEventListener('controlling', () => {
							window.location.reload()
						})

						// Send a message telling the service worker to skip waiting.
						// This will trigger the `controlling` event handler above.
						this.wb.messageSW({
							type: 'SKIP_WAITING'
						})
					}
				})

				// Register the service worker after event listeners have been added.
				this.wb.register().then((registration) => {
					this.registration = registration
					console.log('Service worker registered: ', registration)
				}).catch((registrationError) => {
					console.warn('Service worker registration failed: ', registrationError)
				})
			})
		}
		this.isInitialized = true
	}
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Workbox
} from 'workbox-window'
import jsonpatch from 'fast-json-patch'
import {
	deepEqual
} from 'fast-equals'
import _ from 'lodash'
import * as environment from './environment'
import {
	urlBase64ToUint8Array
} from '../../lib/ui-components/services/helpers'
import {
	errorReporter
} from './core'

const SERVICE_WORKER_URL = '/service-worker.js'

const parsePushSubscription = (pushSubscription) => {
	const pushSubscriptionResult = pushSubscription.toJSON()
	return {
		endpoint: pushSubscriptionResult.endpoint,
		auth: pushSubscriptionResult.keys.auth,
		token: pushSubscriptionResult.keys.p256dh
	}
}

const buildExistingSubscriptionQuery = (userId, endpoint) => {
	return {
		$$links: {
			'is subscribed for': {
				type: 'object',
				required: [ 'id' ],
				additionalProperties: false,
				properties: {
					id: {
						const: userId
					}
				}
			}
		},
		description: `Get web push subscription for ${userId}`,
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			type: {
				const: 'web-push-subscription@1.0.0'
			},
			data: {
				type: 'object',
				required: [ 'endpoint', 'auth', 'token' ],
				additionalProperties: false,
				properties: {
					endpoint: {
						const: endpoint
					}
				}
			},
			links: {
				type: 'object'
			}
		},
		additionalProperties: false,
		required: [ 'id', 'type', 'data' ]
	}
}

const getMatchingSubscription = async (userId, endpoint, sdk) => {
	const [ matchingSubscription ] = await sdk.query(
		buildExistingSubscriptionQuery(userId, endpoint),
		{
			limit: 1
		}
	)
	return matchingSubscription
}

export class PWA {
	constructor () {
		this.isInitialized = false
		this.wb = null
		this.registration = null
		this.pushSubscription = null
		this.postActivationTasks = []
	}

	init (options) {
		if (this.isInitialized) {
			return
		}
		if (!environment.isProduction() && !options.debugServiceWorker) {
			console.log('PWA: service worker registration skipped. Set the JF_DEBUG_SW environment variable to override this.')
			return
		}
		this.options = options

		if ('serviceWorker' in navigator) {
			this.wb = options.workbox || new Workbox(SERVICE_WORKER_URL)

			// Fires when the registered service worker has installed but is waiting to activate.
			this.wb.addEventListener('waiting', () => {
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

			// When the SW is activated, call any tasks that require an active SW
			this.wb.addEventListener('activated', () => {
				let task = null
				if (!this.registration) {
					errorReporter.reportException(new Error('Workbox received activated event but registration not complete'))
					return
				}
				while ((task = this.postActivationTasks.pop())) {
					task(this.registration)
				}
			})

			// Register the service worker after event listeners have been added.
			// Note: By default this waits until the window is loaded before attempting to register the SW
			this.wb.register()
				.then((registration) => {
					this.registration = registration
				})
				.catch((registrationError) => {
					errorReporter.reportException(registrationError, {
						message: 'Failed to register service worker'
					})
				})
		}
		this.isInitialized = true
	}

	subscribeToPushNotifications (user, sdk, {
		vapidPublicKey,
		onSubscribed
	}) {
		if (!this.isInitialized) {
			const initializationExpected = environment.isProduction() || _.get(this, [ 'options', 'debugServiceWorker' ])
			if (initializationExpected) {
				throw new Error('PWA: Cannot subscribe to push notifications until service worker has been initialized')
			}
			console.log('PWA: Skipping web-push notification subscription as PWA is not initialized')
			return
		}

		if (!this.options.enableWebPush) {
			return
		}

		if (!vapidPublicKey) {
			errorReporter.reportException(
				new Error('No VAPID public key provided. Make sure you have set the VAPID_PUBLIC_KEY environment variable!'))
			return
		}

		this.subscriptionOptions = {
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
		}

		const subscribeToPushManager = async (registration) => {
			try {
				this.pushSubscription = await registration.pushManager.subscribe(this.subscriptionOptions)
				const pushSubscriptionData = parsePushSubscription(this.pushSubscription)

				const matchingSubscription = await getMatchingSubscription(user.id, pushSubscriptionData.endpoint, sdk)

				if (matchingSubscription) {
					if (!deepEqual(matchingSubscription.data, pushSubscriptionData)) {
						// Update the existing card with the new push subscription data
						const updatedSubscription = _.defaultsDeep({
							data: pushSubscriptionData
						}, matchingSubscription)
						const patches = jsonpatch.compare(matchingSubscription, updatedSubscription)
						await sdk.card.update(matchingSubscription.id, matchingSubscription.type, patches)
					}
					if (onSubscribed) {
						onSubscribed()
					}
					return
				}

				// Create a new web-push-subscription card to store the subscription details
				const newSubscription = await sdk.card.create({
					type: 'web-push-subscription@1.0.0',
					data: pushSubscriptionData
				})

				// ... and link it to the authenticated user
				await sdk.card.link(user, newSubscription, 'is subscribed with')
				if (onSubscribed) {
					onSubscribed()
				}
			} catch (error) {
				errorReporter.reportException(error, {
					message: 'Failed to subscribe to web push notifications',
					userId: user.id
				})
			}
		}

		// If we're active, we can subscribe now
		if (_.get(this, [ 'registration', 'active' ])) {
			subscribeToPushManager(this.registration)
		} else {
			// ...otherwise just add this to the list of tasks to do after activation
			this.postActivationTasks.push((registration) => {
				subscribeToPushManager(registration)
			})
		}
	}

	unsubscribeFromPushNotifications (user, sdk, {
		onUnsubscribed
	}) {
		if (!this.isInitialized) {
			const initializationExpected = environment.isProduction() || _.get(this, [ 'options', 'debugServiceWorker' ])
			if (initializationExpected) {
				throw new Error('PWA: Cannot unsubscribe from push notifications until service worker has been initialized')
			}
			console.log('PWA: Skipping web-push notification unsubscribe as PWA is not initialized')
			return
		}

		const unsubscribeFromPushManager = async (registration) => {
			try {
				const pushSubscription = this.pushSubscription || (await registration.pushManager.getSubscription())
				if (pushSubscription) {
					await pushSubscription.unsubscribe()
					const pushSubscriptionData = parsePushSubscription(pushSubscription)
					const matchingSubscription = await getMatchingSubscription(user.id, pushSubscriptionData.endpoint, sdk)
					if (matchingSubscription) {
						// Unlink it from the authenticated user
						await sdk.card.unlink(user, matchingSubscription, 'is subscribed with')

						// ...and then remove the web-push-subscription card
						await sdk.card.remove(matchingSubscription.id, matchingSubscription.type)
					}
				}
				if (typeof onUnsubscribed === 'function') {
					onUnsubscribed()
				}
			} catch (error) {
				errorReporter.reportException(error, {
					message: 'Failed to unsubscribe from web push notifications',
					userId: user.id
				})
			}
		}

		// If we're active, we can unsubscribe now
		if (_.get(this, [ 'registration', 'active' ])) {
			unsubscribeFromPushManager(this.registration)
		} else {
			// ...otherwise just add this to the list of tasks to do after activation
			this.postActivationTasks.push((registration) => {
				unsubscribeFromPushManager(registration)
			})
		}
	}
}

export default new PWA()

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import ava from 'ava'
import sinon from 'sinon'
import {
	PWA
} from './pwa'
import * as environment from './environment'
import {
	errorReporter
} from './core'

global.window = {
	atob: _.identity
}

const pushSubscriptionCardId = 'wps1'

const sandbox = sinon.createSandbox()

const options = {
	debugServiceWorker: true,
	enableWebPush: true
}

const vapidPublicKey = 'testkey'

const user = {
	id: '1',
	type: 'user@1.0.0'
}

const pushSubscriptionData = {
	endpoint: 'test-endpoint',
	keys: {
		auth: 'test-auth',
		p256dh: 'test-p256dh'
	}
}

const getPromiseResolver = () => {
	let resolver = null
	const promise = new Promise((resolve) => {
		resolver = resolve
	})
	return {
		promise,
		resolver
	}
}

ava.beforeEach((test) => {
	errorReporter.reportException = sandbox.fake()
	environment.isProduction = _.constant(true)
	test.context.pwa = new PWA()
	test.context.pushSubscription = {
		unsubscribe: sandbox.fake.returns(true),
		toJSON: sandbox.fake.returns(pushSubscriptionData)
	}
})

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('PWA skips initialization if already initialized', (test) => {
	const {
		pwa
	} = test.context
	pwa.isInitialized = true
	test.notThrows(() => {
		// This would throw an exception if it tried to call any methods
		// on the window or Workbox objects
		pwa.init(options)
	})
})

ava('PWA skips initialization if not production and debugServiceWorker option not set', (test) => {
	const {
		pwa
	} = test.context
	environment.isProduction = _.constant(false)
	test.false(pwa.isInitialized)
	pwa.init({
		...options,
		debugServiceWorker: false
	})
	test.false(pwa.isInitialized)
})

ava('PWA can be initialized', async (test) => {
	const {
		pwa
	} = test.context
	const eventCallbacks = {}
	const onWbAddEventListener = {
		activated: getPromiseResolver(),
		waiting: getPromiseResolver(),
		controlling: getPromiseResolver()
	}
	const onMessageWS = getPromiseResolver()
	const onRegister = getPromiseResolver()
	const postActivation = getPromiseResolver()

	global.navigator = {
		serviceWorker: {}
	}

	global.window.location = {
		reload: sandbox.fake()
	}
	global.window.confirm = sandbox.fake.returns(true)

	const fakeRegistration = {
		__testID: 'fake!'
	}

	const fakeWorkbox = {
		addEventListener: (eventName, func) => {
			eventCallbacks[eventName] = func
			onWbAddEventListener[eventName].resolver(eventName)
		},
		messageSW: (swOptions) => {
			onMessageWS.resolver(swOptions)
		},
		register: () => {
			onRegister.resolver(fakeRegistration)
			return onRegister.promise
		}
	}

	// HACK: add a task so we know when activation
	// has been completed
	pwa.postActivationTasks.push((registration) => {
		postActivation.resolver(registration)
	})

	pwa.init({
		...options,
		workbox: fakeWorkbox
	})

	const waitingEvent = await onWbAddEventListener.waiting.promise
	test.is(waitingEvent, 'waiting')

	eventCallbacks.waiting()

	test.true(window.confirm.calledOnce)

	const controllingEvent = await onWbAddEventListener.controlling.promise
	test.is(controllingEvent, 'controlling')

	eventCallbacks.controlling()

	test.true(window.location.reload.calledOnce)

	const messageOptions = await onMessageWS.promise
	test.is(messageOptions.type, 'SKIP_WAITING')

	await onRegister.promise

	const activatedEvent = await onWbAddEventListener.activated.promise
	test.is(activatedEvent, 'activated')

	eventCallbacks.activated()

	const receivedRegistration = await postActivation.promise
	// eslint-disable-next-line no-underscore-dangle
	test.is(receivedRegistration.__testID, fakeRegistration.__testID)

	test.true(pwa.isInitialized)
	test.truthy(pwa.registration)
	test.truthy(pwa.wb)
})

ava('Push notification subscription throws an error if PWA is not initialized', (test) => {
	const {
		pwa
	} = test.context
	test.throws(() => {
		test.false(pwa.isInitialized)
		pwa.subscribeToPushNotifications({}, {}, {
			vapidPublicKey
		})
	}, {
		message: 'PWA: Cannot subscribe to push notifications until service worker has been initialized'
	})
})

ava('Push notification subscription is skipped if enableWebPush is not set', (test) => {
	const {
		pwa
	} = test.context
	pwa.isInitialized = true
	pwa.options = {
		enableWebPush: false
	}
	test.notThrows(() => {
		// This would throw an exception if the subscription logic
		// was actually executed
		pwa.subscribeToPushNotifications({}, {}, {
			vapidPublicKey
		})
	})
})

ava('Push notification subscription reports error and skips if VAPID public key is not provided', (test) => {
	const {
		pwa
	} = test.context
	pwa.isInitialized = true
	pwa.options = {
		enableWebPush: true
	}
	pwa.subscribeToPushNotifications({}, {}, {})
	test.true(errorReporter.reportException.calledOnce)
	test.is(
		errorReporter.reportException.getCall(0).args[0].message,
		'No VAPID public key provided. Make sure you have set the VAPID_PUBLIC_KEY environment variable!'
	)
})

ava('PWA does not add a web-push-subscription if a valid one already exists', async (test) => {
	const {
		pwa,
		pushSubscription
	} = test.context

	const subscribed = getPromiseResolver()

	pwa.isInitialized = true
	pwa.options = options
	pwa.registration = {
		active: {},
		pushManager: {
			subscribe: sandbox.fake.resolves(pushSubscription)
		}
	}

	const sdk = {
		card: {
			create: sandbox.fake()
		},
		query: sandbox.fake.resolves([ {
			id: pushSubscriptionCardId,
			data: {
				endpoint: pushSubscriptionData.endpoint,
				auth: pushSubscriptionData.keys.auth,
				token: pushSubscriptionData.keys.p256dh
			}
		} ])
	}

	pwa.subscribeToPushNotifications(user, sdk, {
		vapidPublicKey,
		onSubscribed: () => {
			subscribed.resolver()
		}
	})

	await subscribed.promise
	test.true(pwa.registration.pushManager.subscribe.calledOnce)
	test.true(sdk.card.create.notCalled)
})

ava('PWA updates existing web-push-subscription if credentials are out-of-date', async (test) => {
	const {
		pwa,
		pushSubscription
	} = test.context

	const subscribed = getPromiseResolver()

	pwa.isInitialized = true
	pwa.options = options
	pwa.registration = {
		active: {},
		pushManager: {
			subscribe: sandbox.fake.resolves(pushSubscription)
		}
	}

	const sdk = {
		card: {
			update: sandbox.fake(),
			create: sandbox.fake(),
			link: sandbox.fake()
		},
		query: sandbox.fake.resolves([ {
			id: pushSubscriptionCardId,
			data: {
				endpoint: pushSubscriptionData.endpoint,
				auth: pushSubscriptionData.keys.auth,
				token: 'some other token'
			}
		} ])
	}

	pwa.subscribeToPushNotifications(user, sdk, {
		vapidPublicKey,
		onSubscribed: () => {
			subscribed.resolver()
		}
	})

	await subscribed.promise
	test.true(pwa.registration.pushManager.subscribe.calledOnce)
	test.true(sdk.query.calledOnce)
	test.true(sdk.card.update.calledOnce)
	test.true(sdk.card.create.notCalled)
	test.true(sdk.card.link.notCalled)
})

ava('PWA creates a new web push subscription if it doesn\'t already exist', async (test) => {
	const {
		pwa,
		pushSubscription
	} = test.context
	const subscribed = getPromiseResolver()

	const sdk = {
		card: {
			create: sandbox.fake.resolves({
				id: pushSubscriptionCardId
			}),
			link: sandbox.fake()
		},
		query: sandbox.fake.resolves([])
	}

	const expectedData = {
		endpoint: pushSubscriptionData.endpoint,
		auth: pushSubscriptionData.keys.auth,
		token: pushSubscriptionData.keys.p256dh
	}

	pwa.isInitialized = true
	pwa.options = options
	pwa.registration = {
		active: {},
		pushManager: {
			subscribe: sandbox.fake.resolves(pushSubscription)
		}
	}

	pwa.subscribeToPushNotifications(user, sdk, {
		vapidPublicKey,
		onSubscribed: () => {
			subscribed.resolver()
		}
	})

	await subscribed.promise
	test.true(pwa.registration.pushManager.subscribe.calledOnce)
	test.true(sdk.query.calledOnce)

	test.true(sdk.card.create.calledOnce)
	test.deepEqual(sdk.card.create.getCall(0).args[0].data, expectedData)

	test.true(sdk.card.link.calledOnce)
	const [ linkedUser, subscription, verb ] = sdk.card.link.getCall(0).args
	test.deepEqual(linkedUser, user)
	test.deepEqual(subscription.id, pushSubscriptionCardId)
	test.is(verb, 'is subscribed with')
})

ava('Push notification subscription is queued up if service worker not yet activated', async (test) => {
	const {
		pwa
	} = test.context

	const sdk = {}
	pwa.isInitialized = true
	pwa.options = options

	test.is(pwa.postActivationTasks.length, 0)
	test.is(pwa.registration, null)
	pwa.subscribeToPushNotifications(user, sdk, {
		vapidPublicKey
	})
	test.is(pwa.postActivationTasks.length, 1)
})

ava('Push notification unsubscribe throws an error if PWA is not initialized', (test) => {
	const {
		pwa
	} = test.context
	test.throws(() => {
		test.false(pwa.isInitialized)
		pwa.unsubscribeFromPushNotifications({}, {}, {})
	}, {
		message: 'PWA: Cannot unsubscribe from push notifications until service worker has been initialized'
	})
})

ava('Push notification unsubscribe removes matching subscription if found', async (test) => {
	const {
		pwa,
		pushSubscription
	} = test.context

	const unsubscribed = getPromiseResolver()

	pwa.isInitialized = true
	pwa.options = options
	pwa.registration = {
		active: {},
		pushManager: {
			getSubscription: sandbox.fake.resolves(pushSubscription)
		}
	}

	const sdk = {
		card: {
			remove: sandbox.fake(),
			unlink: sandbox.fake()
		},
		query: sandbox.fake.resolves([ {
			id: pushSubscriptionCardId,
			type: 'web-push-subscription',
			data: pushSubscriptionData
		} ])
	}

	pwa.unsubscribeFromPushNotifications(user, sdk, {
		onUnsubscribed: () => {
			unsubscribed.resolver()
		}
	})

	await unsubscribed.promise
	test.true(pwa.registration.pushManager.getSubscription.calledOnce)
	test.true(sdk.query.calledOnce)
	test.true(sdk.card.unlink.calledOnce)
	test.true(sdk.card.remove.calledOnce)
})

ava('Push notification unsubscribe skips server interaction if no subscription details available', async (test) => {
	const {
		pwa
	} = test.context

	const unsubscribed = getPromiseResolver()

	pwa.isInitialized = true
	pwa.options = options
	pwa.registration = {
		active: {},
		pushManager: {
			getSubscription: sandbox.fake.resolves(null)
		}
	}

	const sdk = {
		card: {
			remove: sandbox.fake(),
			unlink: sandbox.fake()
		},
		query: sandbox.fake()
	}

	pwa.unsubscribeFromPushNotifications(user, sdk, {
		onUnsubscribed: () => {
			unsubscribed.resolver()
		}
	})

	await unsubscribed.promise
	test.true(pwa.registration.pushManager.getSubscription.calledOnce)
	test.true(sdk.query.notCalled)
	test.true(sdk.card.unlink.notCalled)
	test.true(sdk.card.remove.notCalled)
})

ava('Push notification unsubscribe skips card unlinking and removal if no matching subscription found', async (test) => {
	const {
		pwa,
		pushSubscription
	} = test.context

	const unsubscribed = getPromiseResolver()

	pwa.isInitialized = true
	pwa.options = options
	pwa.registration = {
		active: {},
		pushManager: {
			getSubscription: sandbox.fake.resolves(pushSubscription)
		}
	}

	const sdk = {
		card: {
			remove: sandbox.fake(),
			unlink: sandbox.fake()
		},
		query: sandbox.fake.resolves([])
	}

	pwa.unsubscribeFromPushNotifications(user, sdk, {
		onUnsubscribed: () => {
			unsubscribed.resolver()
		}
	})

	await unsubscribed.promise
	test.true(pwa.registration.pushManager.getSubscription.calledOnce)
	test.true(sdk.query.calledOnce)
	test.true(sdk.card.unlink.notCalled)
	test.true(sdk.card.remove.notCalled)
})

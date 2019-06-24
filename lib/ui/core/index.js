/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import localForage from 'localforage'
import * as _ from 'lodash'
import Analytics from '../services/analytics'
import * as environment from '../environment'
import {
	sdk as SDK
} from './sdk'
import {
	setupStore
} from './store'

export const sdk = SDK

const STORAGE_KEY = 'jellyfish_store'

export const analytics = new Analytics({
	token: environment.analytics.mixpanel.token
})

const bundle = setupStore({
	analytics,
	sdk,
	storageKey: STORAGE_KEY
})

export const selectors = bundle.selectors
export const store = bundle.store
export const actionCreators = bundle.actionCreators

localForage.getItem(STORAGE_KEY)
	.then(async (state) => {
		if (state) {
			// Remove notifications
			_.set(state, [ 'core', 'notifications' ], [])

			// Remove view data
			_.set(state, [ 'views', 'viewData' ], {})

			_.set(state, [ 'core', 'channels' ], _.get(state, [ 'core', 'channels' ], []).slice(0, 1))

			// Typing notices should be removed on reload, otherwise you can end up
			// with a situation where the notice is added, and the page is reloaded
			// before the notice can be removed.
			_.set(state, [ 'core', 'usersTyping' ], {})

			// Ensure that the stored state has a safe structure buy merging it with
			// the default state. This helps gaurd against situations where the
			// defaultstate changes or localStorage becomes corrupted.
			// Additionally, 'status' is always set back to 'initializing', so that the
			// session is re-checked on load, and the UI bootstrapping process
			// functions in the correct order
			store.dispatch(
				actionCreators.setState(
					_.merge(store.getState().core, state.core, {
						status: 'initializing'
					})
				)
			)
		}

		const token = selectors.getSessionToken(store.getState())

		if (token) {
			await store.dispatch(actionCreators.loginWithToken(token))
		} else {
			await store.dispatch(actionCreators.setStatus('unauthorized'))
		}
	})
	.catch((error) => {
		console.error(error)
	})

window.sdk = sdk

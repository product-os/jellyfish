/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global process */
/* eslint-disable no-process-env */
import localForage from 'localforage'
import * as _ from 'lodash'
import {
	Analytics
} from '../services/analytics'
import helpers from '../services/helpers'
import UrlManager from '../services/url-manager'
import {
	sdk as SDK
} from './sdk'
import {
	setupStore
} from './store'

export const sdk = SDK

const ANALYTICS_TOKEN = process.env.MIXPANEL_TOKEN_UI
const STORAGE_KEY = 'jellyfish_store'

export const analytics = new Analytics({
	token: ANALYTICS_TOKEN
})

const bundle = setupStore({
	analytics,
	sdk,
	storageKey: STORAGE_KEY
})

export const selectors = bundle.selectors
export const store = bundle.store
export const actionCreators = bundle.actionCreators

const manager = new UrlManager({
	actionCreators,
	selectors,
	store
})

localForage.getItem(STORAGE_KEY)
	.then(async (state) => {
		if (state) {
			// Remove notifications
			_.set(state, [ 'core', 'notifications' ], [])

			// Remove view data
			_.set(state, [ 'views', 'viewData' ], {})

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
			helpers.debug('FOUND STORED SESSION TOKEN, CHECKING AUTHORIZATION')
			await store.dispatch(actionCreators.loginWithToken(token))
		} else {
			await store.dispatch(actionCreators.setStatus('unauthorized'))
		}

		// Only try and load the URL route if the app is authorized
		if (selectors.getStatus(store.getState()) === 'authorized') {
			manager.setChannelsFromPath()
		}

		store.subscribe(() => {
			return manager.setPathFromState(store.getState())
		})
	})
	.catch((error) => {
		console.error(error)
	})

window.sdk = sdk

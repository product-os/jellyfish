
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* global process */
/* eslint-disable no-process-env */
const Bluebird = require('bluebird')
const localForage = require('localforage')
const _ = require('lodash')
const {
	Analytics
} = require('../services/analytics')
const helpers = require('../services/helpers')
const urlManager = require('../services/url-manager')
const common = require('./common')
const constants = require('./constants')
const {
	sdk
} = require('./sdk')
const store = require('./store')
const ANALYTICS_TOKEN = process.env.MIXPANEL_TOKEN_UI
exports.store = store.createJellyfishStore()
exports.analytics = new Analytics({
	token: ANALYTICS_TOKEN
})
const load = () => {
	return Bluebird.try(() => {
		helpers.debug('LOADING STATE FROM STORAGE')
		return localForage.getItem(constants.STORAGE_KEY)

		// TODO abstract this logic to something more redux-esque
			.then((state) => {
				if (state) {
				// Remove notifications
					_.set(state, [ 'core', 'notifications' ], [])

					// Ensure that the stored state has a safe structure buy merging it with
					// the default state. This helps gaurd against situations where the
					// defaultstate changes or localStorage becomes corrupted.
					// Additionally, 'status' is always set back to 'initializing', so that the
					// session is re-checked on load, and the UI bootstrapping process
					// functions in the correct order
					const defaultState = common.getDefaultState()

					// Remove unknown top level keys from stored state
					_.forEach(_.keys(state), (key) => {
						if (!_.has(defaultState, key)) {
							Reflect.deleteProperty(state, key)
						}
					})
					exports.store.dispatch({
						type: store.actions.SET_STATE,
						value: _.merge(defaultState.core, state.core, {
							status: 'initializing'
						})
					})

					// Load URL route
					urlManager.setChannelsFromPath()
					exports.store.subscribe(() => {
						return urlManager.setPathFromState(exports.store.getState())
					})
				}
			})
	})
}
load()
	.then(() => {
		const token = store.selectors.getSessionToken(exports.store.getState())
		if (token) {
			helpers.debug('FOUND STORED SESSION TOKEN, CHECKING AUTHORIZATION')
			exports.store.dispatch(store.actionCreators.loginWithToken(token))
		} else {
			exports.store.dispatch(store.actionCreators.setStatus('unauthorized'))
		}
		return null
	})
window.sdk = sdk
exports.sdk = sdk

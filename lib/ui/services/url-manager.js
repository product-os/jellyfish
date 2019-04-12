/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import createHashHistory from 'history/createHashHistory'
import * as _ from 'lodash'
import helpers from './helpers'

const PATH_SEPARATOR = '~'
const history = createHashHistory()

export const createPermaLink = (card) => {
	return `${window.location.origin}/#/${card.id}`
}

const getCurrentPathFromUrl = () => {
	return window.location.hash.replace(/^#\//, '')
}

export default class UrlManager {
	constructor (context) {
		this.actionCreators = context.actionCreators
		this.selectors = context.selectors
		this.store = context.store

		history.listen((location, action) => {
			if (action === 'PUSH') {
				return
			}

			// If the user is not authorised, don't attempt to set channels from the path
			if (this.selectors.getStatus(this.store.getState()) !== 'authorized') {
				return
			}
			this.setChannelsFromPath(location.pathname)
		})
	}

	setPathFromState (state) {
		// If the user is not authorised, don't attempt to set the path
		if (this.selectors.getStatus(state) !== 'authorized') {
			return
		}

		// Skip the first 'home' channel
		const channels = _.tail(this.selectors.getChannels(state))
		const url = channels.map(({
			data
		}) => {
			const cardType = data.cardType || _.get(data, [ 'head', 'type' ])
			if (cardType) {
				return `${cardType}${PATH_SEPARATOR}${data.target}`
			}
			return data.target
		}).join('/')

		// Only update the URL if it is different to the current one, to avoid
		// infinite loops
		if (url !== getCurrentPathFromUrl()) {
			history.push(`/${url}`)
		}
	}

	setChannelsFromPath (path = getCurrentPathFromUrl()) {
		const targets = _.trim(path, '/').split('/').filter((part) => {
			return Boolean(part)
		})
		const channels = this.selectors.getChannels(this.store.getState())
		const homeChannel = _.first(channels)
		const newChannels = targets.map((value) => {
			const parts = value.split(PATH_SEPARATOR)

			const options = parts.length === 1
				? {
					target: parts[0]
				}
				: {
					cardType: parts[0],
					target: parts[1]
				}

			if (options.cardType === 'scratchpad-entry') {
				options.cardType = 'support-issue'
			}

			const existingChannel = _.find(channels, [ 'data.target', options.target ])

			// If there is already a channel loaded with the same ID, just re-use it
			if (existingChannel) {
				return existingChannel
			}
			return helpers.createChannel(options)
		})

		const payload = _.compact([ homeChannel, ...newChannels ])
		if (payload.length) {
			this.store.dispatch(this.actionCreators.setChannels(payload))
		}
		newChannels.forEach((channel) => {
			return this.store.dispatch(this.actionCreators.loadChannelData(channel))
		})
	}
}

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const createHashHistory = require('history/createHashHistory')
const _ = require('lodash')
const core = require('../core')
const store = require('../core/store')
const helpers = require('./helpers')
const PATH_SEPARATOR = '~'
const history = createHashHistory.default()

const getCurrentPathFromUrl = () => {
	return window.location.hash.replace(/^#\//, '')
}

exports.createPermaLink = (card) => {
	return `${window.location.origin}/#/${card.id}`
}

exports.setPathFromState = (state) => {
	// Skip the first 'home' channel
	const channels = _.tail(store.selectors.getChannels(state))
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

exports.setChannelsFromPath = (path = getCurrentPathFromUrl()) => {
	const targets = _.trim(path, '/').split('/').filter((part) => {
		return Boolean(part)
	})
	const channels = store.selectors.getChannels(core.store.getState())
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
		core.store.dispatch(store.actionCreators.setChannels(payload))
	}
	newChannels.forEach((channel) => {
		return core.store.dispatch(store.actionCreators.loadChannelData(channel))
	})
}

history.listen((location, action) => {
	if (action === 'PUSH') {
		return
	}
	exports.setChannelsFromPath(location.pathname)
})

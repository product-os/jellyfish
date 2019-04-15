
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const howler = require('howler')
const _ = require('lodash')
const {
	actionCreators,
	store
} = require('../core')

const TIMEOUT = 10 * 1000

const sound = new howler.Howl({
	src: '/audio/dustyroom_cartoon_bubble_pop.mp3'
})

let canUseNotifications = Notification.permission === 'granted'

if (Notification && Notification.permission !== 'denied') {
	Notification.requestPermission((status) => {
		// Status is "granted", if accepted by user
		canUseNotifications = status === 'granted'
	})
}

exports.createNotification = (title, body, target) => {
	if (!canUseNotifications) {
		return
	}

	const notice = new Notification(title, {
		body,
		icon: '/icons/jellyfish.png'
	})

	sound.play()

	const timeout = setTimeout(() => {
		return notice.close()
	}, TIMEOUT)

	notice.onclick = () => {
		store.dispatch(actionCreators.addChannel({
			cardType: 'view',
			target,
			parentChannel: _.get(store.getState(), [ 'channels', '0', 'id' ])
		}))
		clearTimeout(timeout)
		notice.close()
	}
}

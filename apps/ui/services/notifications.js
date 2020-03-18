/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Howl
} from 'howler'
import * as _ from 'lodash'
import {
	actionCreators,
	selectors,
	store
} from '../core'

const TIMEOUT = 10 * 1000

const sound = new Howl({
	src: '/audio/dustyroom_cartoon_bubble_pop.mp3'
})

let canUseNotifications = false
if (typeof window !== 'undefined') {
	canUseNotifications = window.Notification && Notification.permission === 'granted'

	if (window.Notification && Notification.permission !== 'denied') {
		Notification.requestPermission((status) => {
			// Status is "granted", if accepted by user
			canUseNotifications = status === 'granted'
		})
	}
}

export const createNotification = ({
	title,
	body,
	target
}) => {
	if (!canUseNotifications) {
		return
	}

	// Skip notifications if the user's status is set to 'Do Not Disturb'
	const userStatus = selectors.getCurrentUserStatus(store.getState())
	if (_.get(userStatus, [ 'value' ]) === 'DoNotDisturb') {
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
		// Try...catch block is here as in some situations (eg. browser addons)
		// window.focus() can be set to null
		try {
			window.focus()
		} catch (error) {
			console.error()
		}

		store.dispatch(actionCreators.addChannel({
			target,
			parentChannel: _.get(store.getState(), [ 'channels', '0', 'id' ])
		}))
		clearTimeout(timeout)
		notice.close()
	}
}

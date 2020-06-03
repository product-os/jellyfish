/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Howl
} from 'howler'
import path from 'path'
import {
	pathWithoutTarget
} from '../../../lib/ui-components/services/helpers'

const TIMEOUT = 10 * 1000

const sound = new Howl({
	src: '/audio/dustyroom_cartoon_bubble_pop.mp3'
})

let canUseNotifications = false

export const registerForNotifications = async () => {
	if (typeof window !== 'undefined') {
		canUseNotifications = window.Notification && Notification.permission === 'granted'

		if (window.Notification && Notification.permission !== 'denied') {
			const status = await Notification.requestPermission()
			canUseNotifications = status === 'granted'
		}
	}
	return canUseNotifications
}

export const createNotification = ({
	historyPush,
	title,
	body,
	target
}) => {
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
		// Try...catch block is here as in some situations (eg. browser addons)
		// window.focus() can be set to null
		try {
			window.focus()
		} catch (error) {
			console.error()
		}

		const newPath = path.join(pathWithoutTarget(target), target)

		// Don't bother pushing if the location won't actually change
		// (avoid a 'null' history entry)
		if (newPath !== window.location.pathname) {
			historyPush(newPath)
		}

		clearTimeout(timeout)
		notice.close()
	}
}

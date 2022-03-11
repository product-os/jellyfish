import { Howl } from 'howler';
import path from 'path';
import * as helpers from './helpers';

const TIMEOUT = 10 * 1000;

const sound = new Howl({
	src: '/audio/dustyroom_cartoon_bubble_pop.mp3',
});

let canUseNotifications = false;

export const registerForNotifications = () => {
	if (typeof window !== 'undefined') {
		canUseNotifications =
			window.Notification && Notification.permission === 'granted';

		if (window.Notification && Notification.permission !== 'denied') {
			Notification.requestPermission((status) => {
				// Status is "granted", if accepted by user
				canUseNotifications = status === 'granted';
			});
		}
	}
};

export const createNotification = ({
	tag,
	historyPush,
	title,
	body,
	target,
	disableSound,
}) => {
	if (!canUseNotifications) {
		return;
	}

	const notice = new Notification(title, {
		tag,
		body,
		icon: '/icons/jellyfish.png',
	});

	if (!disableSound) {
		sound.play();
	}

	const timeout = setTimeout(() => {
		return notice.close();
	}, TIMEOUT);

	notice.onclick = () => {
		// Try...catch block is here as in some situations (eg. browser addons)
		// window.focus() can be set to null
		try {
			window.focus();
		} catch (error) {
			console.error();
		}

		const newPath = path.join(helpers.pathWithoutTarget(target), target);

		// Don't bother pushing if the location won't actually change
		// (avoid a 'null' history entry)
		if (newPath !== window.location.pathname) {
			historyPush(newPath);
		}

		clearTimeout(timeout);
		notice.close();
	};
};

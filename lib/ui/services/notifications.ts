import { Howl } from 'howler';
import * as _ from 'lodash';
import { store } from '../core';
import { actionCreators } from '../core/store';
import { createChannel } from './helpers';

const TIMEOUT = 10 * 1000;

const sound = new Howl({
	src: '/audio/dustyroom_cartoon_bubble_pop.mp3',
});

let canUseNotifications = (Notification as any).permission === 'granted';

if(Notification && (Notification as any).permission !== 'denied') {
	Notification.requestPermission((status) => {
		// status is "granted", if accepted by user
		canUseNotifications = status === 'granted';
	});
}

export const createNotification = (title: string, body: string, target: string) => {
	if (!canUseNotifications) {
		return;
	}

	const notice = new Notification(title, {
		body,
		icon: '/icons/jellyfish.png',
	});

	sound.play();

	const timeout = setTimeout(() => notice.close(), TIMEOUT);

	notice.onclick = () => {
		store.dispatch(actionCreators.addChannel(createChannel({
			cardType: 'view',
			target,
			parentChannel: _.get(store.getState(), 'channels[0].id'),
		})));
		clearTimeout(timeout);
		notice.close();
	};
};

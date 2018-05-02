import * as _ from 'lodash';
import { createChannel } from './helpers';
import store, { actionCreators } from './store';

const TIMEOUT = 10 * 1000;

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

	const timeout = setTimeout(() => notice.close(), TIMEOUT);

	notice.onclick = () => {
		store.dispatch(actionCreators.addChannel(createChannel({
			target,
			parentChannel: _.get(store.getState(), 'channels[0].id'),
		})));
		clearTimeout(timeout);
		notice.close();
	};
};

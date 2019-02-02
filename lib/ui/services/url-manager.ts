import createHistory from 'history/createHashHistory';
import * as _ from 'lodash';
import { store } from '../core';
import { StoreState } from '../core/store';
import { actionCreators, selectors } from '../core/store';
import { Card } from '../types';
import { createChannel } from './helpers';

const PATH_SEPARATOR = '~';

const history = createHistory();

const getCurrentPathFromUrl = () =>
	window.location.hash.replace(/^#\//, '');

export const createPermaLink = (card: Card) => {
	return `${window.location.origin}/#/${card.id}`;
};

export const setPathFromState = (state: StoreState) => {
	// Skip the first 'home' channel
	const channels = _.tail(selectors.getChannels(state));
	const url = channels.map(({ data }) => {
		const cardType = data.cardType || _.get(data, [ 'head', 'type' ]);
		if (cardType) {
			return `${cardType}${PATH_SEPARATOR}${data.target}`;
		}

		return data.target;
	}).join('/');

	// Only update the URL if it is different to the current one, to avoid
	// infinite loops
	if (url !== getCurrentPathFromUrl()) {
		history.push(`/${url}`);
	}
};

export const setChannelsFromPath = (path?: string) => {
	if (!path) {
		path = getCurrentPathFromUrl();
	}

	const targets = _.trim(path, '/').split('/').filter(p => !!p);
	const channels = selectors.getChannels(store.getState());
	const homeChannel = _.first(channels);

	const newChannels = targets.map(value => {
		const parts = value.split(PATH_SEPARATOR);
		let target: string;
		let cardType: string | undefined;
		if (parts.length === 1) {
			target = parts[0];
		} else {
			cardType = parts[0];
			target = parts[1];
		}

		if (cardType === 'scratchpad-entry') {
			cardType = 'support-issue';
		}

		const existingChannel = _.find(channels, (channel) =>
			channel.data.target === target,
		);

		// If there is already a channel loaded with the same ID, just re-use it
		if (existingChannel) {
			return existingChannel;
		}

		return createChannel({
			target,
			cardType,
		});
	});

	const payload = _.compact([homeChannel, ...newChannels]);

	if (payload.length) {
		store.dispatch(actionCreators.setChannels(payload));
	}

	newChannels.forEach((channel) => store.dispatch(
		actionCreators.loadChannelData(channel),
	));
};

history.listen((location, action) => {
	if (action === 'PUSH') {
		return;
	}
	setChannelsFromPath(location.pathname);
});

import createHistory from 'history/createHashHistory';
import * as _ from 'lodash';
import { store } from '../core';
import { StoreState } from '../core/store';
import { actionCreators, selectors } from '../core/store';
import { createChannel } from './helpers';

const PATH_SEPARATOR = '~';

const history = createHistory();

const getCurrentPathFromUrl = () =>
	window.location.hash.replace(/^#\//, '');

export const setPathFromState = (state: StoreState) => {
	// Skip the first 'home' channel
	const channels = _.tail(selectors.getChannels(state));
	const url = channels.map(({ data }) => {
		return `${data.cardType}${PATH_SEPARATOR}${data.target}`;
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
		const [ cardType, target ] = value.split(PATH_SEPARATOR);

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

import createHistory from 'history/createHashHistory';
import * as _ from 'lodash';
import { JellyfishState } from '../../Types';
import { actionCreators, store } from '../app';
import { createChannel } from './helpers';

const history = createHistory();

const getCurrentPathFromUrl = () =>
	window.location.hash.replace(/^#\//, '');

export const setPathFromState = (state: JellyfishState) => {
	// Skip the first 'home' channel
	const channels = _.tail(state.channels);
	const url = channels.map(({ data }) => data.target).join('/');

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
	const state = store.getState();
	const homeChannel = _.first(state.channels);

	const newChannels = targets.map(target => {
		const existingChannel = _.find(state.channels, (channel) =>
			channel.data.target === target,
		);

		// If there is already a channel loaded with the same ID, just re-use it
		if (existingChannel) {
			return existingChannel;
		}

		return createChannel({
			target,
		});
	});

	store.dispatch(
		actionCreators.setState(
			_.assign({}, state, { channels: [homeChannel, ...newChannels] }),
		),
	);

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

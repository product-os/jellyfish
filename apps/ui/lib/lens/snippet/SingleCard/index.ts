import { connect } from 'react-redux';
import { selectors, State } from '../../../store';
import { withChannelContext } from '../../../hooks/channel-context';
import { createLazyComponent } from '../../../components/SafeLazy';
import type { StateProps, OwnProps } from './SingleContract';

export const SingleContract = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-single-contract" */ './SingleContract'),
);

const Renderer = withChannelContext(
	connect<StateProps, {}, OwnProps, State>((state): StateProps => {
		return {
			channels: selectors.getChannels()(state),
			types: selectors.getTypes()(state),
		};
	})(SingleContract),
);

const lens = {
	slug: 'lens-snippet-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'snippet',
		icon: 'address-card',
		renderer: Renderer,
		filter: {
			type: 'object',
		},
	},
};

export default lens;

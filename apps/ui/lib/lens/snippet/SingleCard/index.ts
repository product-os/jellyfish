import { compose } from 'redux';
import { connect } from 'react-redux';
import { selectors } from '../../../core';
import { withChannelContext } from '../../../hooks/channel-context';
import { createLazyComponent } from '../../../components/SafeLazy';

export const SingleContract = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-single-contract" */ './SingleContract'),
);

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels(state),
		types: selectors.getTypes(state),
	};
};

const lens = {
	slug: 'lens-snippet-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'snippet',
		icon: 'address-card',
		renderer: compose<any>(
			connect(mapStateToProps),
			withChannelContext,
		)(SingleContract),
		filter: {
			type: 'object',
		},
	},
};

export default lens;

import { compose } from 'redux';
import { connect } from 'react-redux';
import { selectors } from '../../../core';
import { withChannelContext } from '../../../hooks/channel-context';
import SingleCard from './SingleCard';

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
		)(SingleCard),
		filter: {
			type: 'object',
		},
	},
};

export default lens;

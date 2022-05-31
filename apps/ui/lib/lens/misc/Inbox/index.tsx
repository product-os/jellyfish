import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators } from '../../../store';

export const Inbox = createLazyComponent(
	() => import(/* webpackChunkName: "lens-inbox" */ './Inbox'),
);

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators(
		_.pick(actionCreators, ['setupStream', 'clearViewData', 'paginateStream']),
		dispatch,
	);
};

export default {
	slug: 'lens-inbox',
	type: 'lens',
	version: '1.0.0',
	name: 'Inbox lens',
	data: {
		pathRegExp: '^inbox$',
		format: 'inbox',
		renderer: connect(null, mapDispatchToProps)(Inbox),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators } from '../../../store';

export const Inbox = createLazyComponent(
	() => import(/* webpackChunkName: "lens-inbox-legacy" */ './InboxLegacy'),
);

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators(actionCreators, dispatch);
};

export default {
	slug: 'lens-inbox-legacy',
	type: 'lens',
	version: '1.0.0',
	name: 'Legacy Inbox lens',
	data: {
		pathRegExp: '^inbox-legacy$',
		format: 'inbox-legacy',
		renderer: connect(null, mapDispatchToProps)(Inbox),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

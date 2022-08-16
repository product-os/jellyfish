import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators } from '../../../store';

export const Flowdock = createLazyComponent(
	() => import(/* webpackChunkName: "lens-flowdock" */ './Flowdock'),
);

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators(actionCreators, dispatch);
};

export default {
	slug: 'lens-flowdock',
	type: 'lens',
	version: '1.0.0',
	name: 'Flowdock lens',
	data: {
		format: 'full',
		renderer: connect(null, mapDispatchToProps)(Flowdock),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
			properties: {
				type: { type: 'string', const: 'flowdock-archive@1.0.0' },
			},
		},
	},
};

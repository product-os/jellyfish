import pick from 'lodash/pick';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators } from '../../../core';

export const EditLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-edit" */ './EditLens'),
);

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			pick(actionCreators, ['removeChannel']),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-action-edit',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'edit',
		renderer: connect(null, mapDispatchToProps)(EditLens),
		icon: 'pencil',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

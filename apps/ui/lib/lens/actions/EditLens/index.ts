import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators } from '../../../core';
import type { OwnProps, DispatchProps } from './EditLens';

export const EditLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-edit" */ './EditLens'),
);

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default {
	slug: 'lens-action-edit',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'edit',
		renderer: connect<{}, DispatchProps, OwnProps>(
			null,
			mapDispatchToProps,
		)(EditLens),
		icon: 'pencil',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

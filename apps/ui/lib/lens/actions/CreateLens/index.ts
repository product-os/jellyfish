import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors, State } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import type { StateProps, DispatchProps, OwnProps } from './CreateLens';

export const CreateLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-create" */ './CreateLens'),
);

const Renderer = connect<StateProps, DispatchProps, OwnProps, State>(
	(state): StateProps => {
		return {
			allTypes: selectors.getTypes()(state),
			relationships: selectors.getRelationships()(state),
		};
	},
	(dispatch): DispatchProps => {
		return {
			actions: bindActionCreators(actionCreators, dispatch),
		};
	},
)(CreateLens);

export default {
	slug: 'lens-action-create',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'create',
		renderer: Renderer,
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

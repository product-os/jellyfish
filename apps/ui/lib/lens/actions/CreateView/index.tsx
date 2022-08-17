import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors, State } from '../../../store';
import type { StateProps, DispatchProps, OwnProps } from './CreateView';

export const CreateView = createLazyComponent(
	() => import(/* webpackChunkName: "lens-create-view" */ './CreateView'),
);

const Renderer = connect<StateProps, DispatchProps, OwnProps, State>(
	(state): StateProps => {
		const user = selectors.getCurrentUser()(state);
		if (!user) {
			throw new Error('User not found');
		}

		return {
			allTypes: selectors.getTypes()(state),
			user,
		};
	},
	(dispatch): DispatchProps => {
		return {
			actions: bindActionCreators(actionCreators, dispatch),
		};
	},
)(CreateView);

export default {
	slug: 'lens-action-create-view',
	type: 'lens',
	version: '1.0.0',
	name: 'View creation lens',
	data: {
		format: 'createView',
		renderer: Renderer,
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

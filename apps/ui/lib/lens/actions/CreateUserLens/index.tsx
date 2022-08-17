import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors, State } from '../../../store';
import type { StateProps, DispatchProps, OwnProps } from './CreateUserLens';

export const CreateUserLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-create-user" */ './CreateUserLens'),
);

const Renderer = connect<StateProps, DispatchProps, OwnProps, State>(
	(state): StateProps => {
		const user = selectors.getCurrentUser()(state);
		if (!user) {
			throw new Error('User not found');
		}
		return {
			user,
		};
	},
	(dispatch): DispatchProps => {
		return {
			actions: bindActionCreators(actionCreators, dispatch),
		};
	},
)(CreateUserLens);

export default {
	slug: 'lens-action-create-user',
	type: 'lens',
	version: '1.0.0',
	name: 'Create user lens',
	data: {
		format: 'create',
		renderer: Renderer,
		icon: 'address-card',
		type: '*',
		action: {
			type: 'string',
			const: 'create',
		},
		filter: {
			type: 'object',
			required: ['types'],
			properties: {
				types: {
					type: 'object',
					required: ['slug'],
					properties: {
						slug: {
							type: 'string',
							const: 'user',
						},
					},
				},
			},
		},
	},
};

import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors, State } from '../../../store';
import { StateProps, DispatchProps, OwnProps } from './EditMyUserLens';

export const EditLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-edit" */ './EditMyUserLens'),
);

const Renderer = connect<StateProps, DispatchProps, OwnProps, State>(
	(state): StateProps => {
		return {
			types: selectors.getTypes()(state),
		};
	},
	(dispatch): DispatchProps => {
		return {
			actions: bindActionCreators(actionCreators, dispatch),
		};
	},
)(EditLens);

export default {
	slug: 'lens-action-edit-my-user',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens for editing own user contract',
	data: {
		format: 'edit',
		renderer: Renderer,
		icon: 'pencil',
		type: '*',
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user@1.0.0',
				},
				slug: {
					type: 'string',
					const: {
						$eval: 'user.slug',
					},
				},
			},
		},
	},
};

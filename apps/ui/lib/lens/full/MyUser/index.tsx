import { connect } from 'react-redux';
import _ from 'lodash';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors, State } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import type { StateProps, DispatchProps, OwnProps } from './MyUser';

export const MyUser = createLazyComponent(
	() => import(/* webpackChunkName: "lens-my-user" */ './MyUser'),
);

const SLUG = 'lens-my-user';

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
)(MyUser);

export default {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		icon: 'address-card',
		format: 'full',
		renderer: Renderer,
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

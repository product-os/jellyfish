import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors, State } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import type { StateProps, DispatchProps, OwnProps } from './SupportThreadBase';

export const SupportThreadBase = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-support-thread" */ './SupportThreadBase'),
);

const Renderer = connect<StateProps, DispatchProps, OwnProps, State>(
	(state): StateProps => {
		const user = selectors.getCurrentUser()(state);

		if (!user) {
			throw new Error('Cannot render without a user');
		}

		return {
			types: selectors.getTypes()(state),
			groups: selectors.getGroups()(state),
			user,
		};
	},

	(dispatch): DispatchProps => {
		return {
			actions: bindActionCreators(actionCreators, dispatch),
		};
	},
)(SupportThreadBase);

export default {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: Renderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'support-thread@1.0.0',
				},
			},
		},
	},
};

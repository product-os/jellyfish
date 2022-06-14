import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import * as _ from 'lodash';
import type { StateProps, DispatchProps, OwnProps } from './SupportThreadBase';

export const SupportThreadBase = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-support-thread" */ './SupportThreadBase'),
);

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes()(state),
		groups: selectors.getGroups()(state),
		user: selectors.getCurrentUser()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect<StateProps, DispatchProps, OwnProps>(
			mapStateToProps,
			mapDispatchToProps,
		)(SupportThreadBase),
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

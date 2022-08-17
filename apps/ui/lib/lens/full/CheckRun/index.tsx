import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors, State } from '../../../store';
import type { StateProps, DispatchProps, OwnProps } from './CheckRun';

export const CheckRun = createLazyComponent(
	() => import(/* webpackChunkName: "lens-check-run" */ './CheckRun'),
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
)(CheckRun);

const lens = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: Renderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'check-run@1.0.0',
				},
			},
		},
	},
};

export default lens;

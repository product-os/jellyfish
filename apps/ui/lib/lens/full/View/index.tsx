import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { withResponsiveContext } from '../../../hooks/use-responsive-context';
import { actionCreators, selectors, State } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import type { StateProps, DispatchProps, OwnProps } from './ViewRenderer';

export const ViewRenderer = createLazyComponent(
	() => import(/* webpackChunkName: "lens-view" */ './ViewRenderer'),
);

const WrappedViewRenderer = withResponsiveContext(
	connect<StateProps, DispatchProps, OwnProps, State>(
		(state, ownProps): StateProps => {
			const target = ownProps.card.id;

			return {
				channels: selectors.getChannels()(state),
				types: selectors.getTypes()(state),
				userActiveLens: selectors.getUsersViewLens(target)(state),
				userCustomFilters: selectors.getUserCustomFilters(target)(state),
			};
		},

		(dispatch): DispatchProps => {
			return {
				actions: bindActionCreators(
					_.pick(actionCreators, ['setViewLens', 'setViewSlice']),
					dispatch,
				),
			};
		},
	)(ViewRenderer),
);

const viewLens = {
	slug: 'lens-view',
	type: 'lens',
	version: '1.0.0',
	name: 'View lens',
	data: {
		type: 'view',
		icon: 'filter',
		format: 'full',
		renderer: WrappedViewRenderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'view@1.0.0',
				},
			},
		},
	},
};

export default viewLens;

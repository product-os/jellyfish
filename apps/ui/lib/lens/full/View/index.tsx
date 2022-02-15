import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { withResponsiveContext } from '@balena/jellyfish-ui-components';
import { actionCreators, selectors } from '../../../core';
import { createLazyComponent } from '../../../components/SafeLazy';

export const ViewRenderer = createLazyComponent(
	() => import(/* webpackChunkName: "lens-view" */ './ViewRenderer'),
);

const mapStateToProps = (state, ownProps) => {
	const target = ownProps.channel.data.head.id;
	const user = selectors.getCurrentUser(state);

	return {
		channels: selectors.getChannels(state),
		types: selectors.getTypes(state),
		user,
		userActiveLens: selectors.getUsersViewLens(state, target),
		userActiveSlice: selectors.getUsersViewSlice(state, target),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, ['setViewLens', 'setViewSlice']),
			dispatch,
		),
	};
};

const WrappedViewRenderer = redux.compose(
	connect(mapStateToProps, mapDispatchToProps),
	withResponsiveContext,
)(ViewRenderer);

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

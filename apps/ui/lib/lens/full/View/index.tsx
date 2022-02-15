import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { withResponsiveContext } from '@balena/jellyfish-ui-components';
import jsf from 'json-schema-faker';
import { actionCreators, selectors } from '../../../core';
import { getLenses } from '../../';
import { createLazyComponent } from '../../../components/SafeLazy';
import { createSyntheticViewCard, getSearchViewId } from './ViewRenderer';

export const ViewRenderer = createLazyComponent(
	() => import(/* webpackChunkName: "lens-view" */ './ViewRenderer'),
);

const mapStateToProps = (state, ownProps) => {
	const target = ownProps.channel.data.head.id;
	const targetTail = selectors.getViewData(state, target);
	const timelineSearchTail = selectors.getViewData(
		state,
		getSearchViewId(target),
	);
	const tail =
		targetTail && timelineSearchTail
			? _.unionBy(targetTail, timelineSearchTail, 'id')
			: null;
	const user = selectors.getCurrentUser(state);

	let lenses: any[] = [];

	// Select a set of lenses based on the tail data
	if (tail && tail.length) {
		lenses = getLenses('list', tail, user, 'data.icon');
	} else {
		// If there isn't a tail loaded, mock the expected output based on the query
		// schema and use the mock to select appropriate lenses
		const svc = createSyntheticViewCard(ownProps.channel.data.head, []);
		const mock = jsf.generate({
			type: 'object',
			allOf: _.map(_.get(svc, ['data', 'allOf'], []), 'schema'),
		});
		lenses = getLenses('list', [mock], user, 'data.icon');
	}

	return {
		channels: selectors.getChannels(state),
		tail,
		lenses,
		types: selectors.getTypes(state),
		user,
		userActiveLens: selectors.getUsersViewLens(state, target),
		userActiveSlice: selectors.getUsersViewSlice(state, target),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'clearViewData',
				'loadViewData',
				'loadMoreViewData',
				'setViewData',
				'setViewLens',
				'setViewSlice',
			]),
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

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import _ from 'lodash';
import { compose, bindActionCreators } from 'redux';
import { helpers } from '@balena/jellyfish-ui-components';
import { actionCreators, sdk, selectors } from '../../../core';
import { Chart } from './Chart';
import { createLazyComponent } from '../../../components/SafeLazy';

// eslint-disable-next-line
const ChartLazy = createLazyComponent(
	() => import(/* webpackChunkName: "chart" */ './PlotlyChart'),
);

const mapStateToProps = (state, ownProps) => {
	const types = selectors.getTypes(state);
	const chartConfigurationType = helpers.getType('chart-configuration', types);
	return {
		sdk,
		activeLoop: selectors.getActiveLoop(state),
		chartConfigurationType,
		ChartComponent: ChartLazy,
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['addChannel']),
			dispatch,
		),
	};
};

const lens = {
	slug: 'lens-chart',
	type: 'lens',
	version: '1.0.0',
	name: 'Generic chart lens',
	data: {
		label: 'Chart',
		icon: 'chart-bar',
		format: 'list',
		renderer: compose(
			withRouter,
			connect(mapStateToProps, mapDispatchToProps),
		)(Chart),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
					},
				},
			},
		},
		queryOptions: {
			mask: (query) => {
				Reflect.deleteProperty(query, '$$links');

				return query;
			},
			limit: 1000,
			sortBy: ['created_at'],
			sortDir: 'desc',
		},
	},
};

export default lens;

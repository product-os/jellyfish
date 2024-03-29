import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import _ from 'lodash';
import { compose, bindActionCreators } from 'redux';
import * as helpers from '../../../services/helpers';
import { actionCreators, selectors } from '../../../store';
import { Chart } from './Chart';
import { createLazyComponent } from '../../../components/SafeLazy';
import { withSetup } from '../../../components';

const ChartLazy = createLazyComponent(
	() => import(/* webpackChunkName: "lens-chart" */ './PlotlyChart'),
);

const mapStateToProps = (state) => {
	const types = selectors.getTypes()(state);
	const chartConfigurationType = helpers.getType('chart-configuration', types);
	return {
		activeLoop: selectors.getActiveLoop()(state),
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
		hideFooter: true,
		renderer: compose(
			withRouter,
			withSetup,
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
			limit: 1000,
			sortBy: ['created_at'],
			sortDir: 'desc',
		},
	},
};

export default lens;

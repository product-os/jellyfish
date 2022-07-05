import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { actionCreators, selectors } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import { withSetup } from '../../../components/SetupProvider';
import { SLUG } from './SupportThreads';

export const SupportThreads = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-support-threads" */ './SupportThreads'),
);

const mapStateToProps = (state, ownProps) => {
	const target = _.get(ownProps, ['channel', 'data', 'head', 'id']);
	return {
		user: selectors.getCurrentUser()(state),
		channels: selectors.getChannels()(state),
		lensState: selectors.getLensState(SLUG, target)(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, ['getActor', 'setLensState']),
			dispatch,
		),
	};
};

const lens = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'SupportThreads lens',
	data: {
		label: 'Support threads list',
		icon: 'address-card',
		format: 'list',
		renderer: withSetup(
			connect(mapStateToProps, mapDispatchToProps)(SupportThreads),
		),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
					},
					slug: {
						type: 'string',
					},
					type: {
						type: 'string',
						enum: ['support-thread@1.0.0', 'sales-thread@1.0.0'],
					},
					data: {
						type: 'object',
						properties: {
							status: {
								type: 'string',
							},
						},
					},
				},
				required: ['type', 'data'],
			},
		},
		queryOptions: {
			limit: 100,
			sortBy: ['created_at'],
			sortDir: 'desc',
		},
	},
};
export default lens;

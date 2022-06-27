import _ from 'lodash';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import { SLUG } from './Kanban';
import type { DispatchProps, StateProps, OwnProps } from './Kanban';
import type { LensContract } from '../../../types';

export const Kanban = createLazyComponent(
	() => import(/* webpackChunkName: "lens-kanban" */ './Kanban'),
);

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

const lens: LensContract = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Kanban lens',
	data: {
		supportsSlices: true,
		label: 'Kanban',
		icon: 'columns',
		format: 'list',
		renderer: withRouter(
			connect<StateProps, DispatchProps, OwnProps>(
				mapStateToProps,
				mapDispatchToProps,
			)(Kanban),
		),
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
			limit: 500,
			sortBy: 'created_at',
			sortDir: 'desc',
		},
	},
};

export default lens;

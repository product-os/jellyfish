import _ from 'lodash';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import { SLUG } from './Kanban';

export const Kanban = createLazyComponent(
	() => import(/* webpackChunkName: "lens-kanban" */ './Kanban'),
);

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes()(state),
		user: selectors.getCurrentUser()(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['addChannel', 'openCreateChannel']),
			dispatch,
		),
	};
};

const lens = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Kanban lens',
	data: {
		supportsSlices: true,
		label: 'Kanban',
		icon: 'columns',
		format: 'list',
		renderer: withRouter(connect(mapStateToProps, mapDispatchToProps)(Kanban)),
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
			sortBy: ['created_at'],
			sortDir: 'desc',
		},
	},
};

export default lens;

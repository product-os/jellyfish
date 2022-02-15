import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../../core';
import { createLazyComponent } from '../../../components/SafeLazy';

export const List = createLazyComponent(
	() => import(/* webpackChunkName: "lens-list" */ './List'),
);

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state),
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

const listLens = {
	slug: 'lens-list',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		label: 'List',
		format: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(List),
		icon: 'address-card',
		type: '*',
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
				},
			},
		},
	},
};

export default listLens;

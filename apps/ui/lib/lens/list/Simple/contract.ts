import _ from 'lodash';
import { actionCreators, selectors } from '../../../store';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { createLazyComponent } from '../../../components/SafeLazy';

export const SimpleList = createLazyComponent(
	() => import(/* webpackChunkName: "lens-list" */ './component'),
);

const mapStateToProps = (state) => {
	const user = selectors.getCurrentUser()(state);

	if (!user) {
		throw new Error('Cannot render without a user');
	}

	return {
		user,
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

export const lens = {
	slug: 'lens-list',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		label: 'List',
		format: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SimpleList),
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

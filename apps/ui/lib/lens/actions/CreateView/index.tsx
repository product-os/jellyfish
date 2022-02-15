import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { sdk, actionCreators, selectors } from '../../../core';

export const CreateView = createLazyComponent(
	() => import(/* webpackChunkName: "lens-create-view" */ './CreateView'),
);

const mapStateToProps = (state) => {
	return {
		sdk,
		allTypes: selectors.getTypes(state),
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, ['createLink', 'removeChannel']),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-action-create-view',
	type: 'lens',
	version: '1.0.0',
	name: 'View creation lens',
	data: {
		format: 'createView',
		renderer: connect(mapStateToProps, mapDispatchToProps)(CreateView),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

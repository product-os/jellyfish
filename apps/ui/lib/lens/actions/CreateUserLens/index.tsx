import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors } from '../../../store';

export const CreateUserLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-create-user" */ './CreateUserLens'),
);

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser()(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, ['removeChannel', 'addUser']),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-action-create-user',
	type: 'lens',
	version: '1.0.0',
	name: 'Create user lens',
	data: {
		format: 'create',
		renderer: connect(mapStateToProps, mapDispatchToProps)(CreateUserLens),
		icon: 'address-card',
		type: '*',
		action: {
			type: 'string',
			const: 'create',
		},
		filter: {
			type: 'object',
			required: ['types'],
			properties: {
				types: {
					type: 'object',
					required: ['slug'],
					properties: {
						slug: {
							type: 'string',
							const: 'user',
						},
					},
				},
			},
		},
	},
};

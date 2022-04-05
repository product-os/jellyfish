import pick from 'lodash/pick';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors } from '../../../core';

export const EditLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-edit" */ './EditMyUserLens'),
);

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default {
	slug: 'lens-action-edit-my-user',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens for editing own user contract',
	data: {
		format: 'edit',
		renderer: connect(mapStateToProps, mapDispatchToProps)(EditLens),
		icon: 'pencil',
		type: '*',
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user@1.0.0',
				},
				slug: {
					type: 'string',
					const: {
						$eval: 'user.slug',
					},
				},
			},
		},
	},
};

import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import pick from 'lodash/pick';
import { actionCreators, sdk, selectors } from '../../../core';
import { createLazyComponent } from '../../../components/SafeLazy';

export const CreateLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-create" */ './CreateLens'),
);

const mapStateToProps = (state) => {
	return {
		sdk,
		allTypes: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			pick(actionCreators, [
				'createLink',
				'addChannel',
				'removeChannel',
				'getLinks',
				'queryAPI',
			]),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-action-create',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'create',
		renderer: connect(mapStateToProps, mapDispatchToProps)(CreateLens),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

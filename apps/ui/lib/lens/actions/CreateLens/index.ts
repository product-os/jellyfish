import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { actionCreators, selectors } from '../../../store';
import { createLazyComponent } from '../../../components/SafeLazy';
import { withSetup } from '../../../components';

export const CreateLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-create" */ './CreateLens'),
);

const mapStateToProps = (state) => {
	return {
		allTypes: selectors.getTypes()(state),
		relationships: selectors.getRelationships()(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default {
	slug: 'lens-action-create',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'create',
		renderer: compose(
			withSetup,
			connect(mapStateToProps, mapDispatchToProps),
		)(CreateLens),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object',
		},
	},
};

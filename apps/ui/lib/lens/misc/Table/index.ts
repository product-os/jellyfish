import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors } from '../../../store';

export const ContractTable = createLazyComponent(
	() => import(/* webpackChunkName: "lens-contract-table" */ './ContractTable'),
);

const SLUG = 'lens-table';

const mapStateToProps = (state, ownProps) => {
	const target = _.get(ownProps, ['channel', 'data', 'head', 'id']);
	return {
		allTypes: selectors.getTypes()(state),
		activeLoop: selectors.getActiveLoop()(state),
		user: selectors.getCurrentUser()(state),
		lensState: selectors.getLensState(SLUG, target)(state),
		SLUG,
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'openCreateChannel',
				'createLink',
				'setLensState',
			]),
			dispatch,
		),
	};
};

const lens = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Default table lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(ContractTable),
		label: 'Table',
		icon: 'table',
		format: 'list',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string',
					},
				},
			},
		},
	},
};

export default lens;

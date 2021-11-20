import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../../core';
import CardTable from './CardTable';

const SLUG = 'lens-table';

const mapStateToProps = (state, ownProps) => {
	const target = _.get(ownProps, ['channel', 'data', 'head', 'id']);
	return {
		allTypes: selectors.getTypes(state),
		activeLoop: selectors.getActiveLoop(state),
		user: selectors.getCurrentUser(state),
		lensState: selectors.getLensState(state, SLUG, target),
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
		renderer: connect(mapStateToProps, mapDispatchToProps)(CardTable),
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

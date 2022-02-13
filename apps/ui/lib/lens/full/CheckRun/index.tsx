import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../../core';
import CheckRun from './CheckRun';

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'createLink',
				'addChannel',
				'getLinks',
				'queryAPI',
			]),
			dispatch,
		),
	};
};

const lens = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(CheckRun),
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'check-run@1.0.0',
				},
			},
		},
	},
};

export default lens;

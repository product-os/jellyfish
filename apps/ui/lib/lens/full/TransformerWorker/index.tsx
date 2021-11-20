import * as _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../../core';
import { TransformerWorker, SLUG } from './TransformerWorker';

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
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Transformer Worker lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(TransformerWorker),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'transformer-worker@1.0.0',
				},
			},
		},
	},
};

export default lens;

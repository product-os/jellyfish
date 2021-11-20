import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../core';
import CompletePasswordReset from './CompletePasswordReset';

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['completePasswordReset']),
			dispatch,
		),
	};
};

export default connect(null, mapDispatchToProps)(CompletePasswordReset);

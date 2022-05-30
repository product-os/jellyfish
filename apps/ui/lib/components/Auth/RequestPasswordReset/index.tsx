import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';
import RequestPasswordReset from './RequestPasswordReset';

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['requestPasswordReset']),
			dispatch,
		),
	};
};

export default connect(null, mapDispatchToProps)(RequestPasswordReset);

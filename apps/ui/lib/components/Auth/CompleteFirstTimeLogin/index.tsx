import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';
import CompleteFirstTimeLogin from './CompleteFirstTimeLogin';

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['completeFirstTimeLogin']),
			dispatch,
		),
	};
};

export default connect(null, mapDispatchToProps)(CompleteFirstTimeLogin);

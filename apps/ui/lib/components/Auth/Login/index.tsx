import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';
import Login from './Login';

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(_.pick(actionCreators, ['login']), dispatch),
	};
};

export default connect(null, mapDispatchToProps)(Login);

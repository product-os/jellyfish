import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { withResponsiveContext } from '../../hooks/use-responsive-context';
import { actionCreators, selectors } from '../../store';
import RouteHandler from './RouteHandler';

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes()(state),
		channels: selectors.getChannels()(state),
		status: selectors.getStatus()(state),
		user: selectors.getCurrentUser()(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
)(withResponsiveContext(RouteHandler));

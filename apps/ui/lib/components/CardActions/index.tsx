import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, sdk, selectors } from '../../core';
import CardActions from './CardActions';

const mapStateToProps = (state) => {
	return {
		sdk,
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['addChannel', 'createLink', 'queryAPI']),
			dispatch,
		),
	};
};

export default connect<any, any, any>(
	mapStateToProps,
	mapDispatchToProps,
)(CardActions);

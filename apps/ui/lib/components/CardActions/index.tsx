import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { actionCreators, selectors } from '../../store';
import { withSetup } from '../SetupProvider';
import CardActions from './CardActions';

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes()(state),
		user: selectors.getCurrentUser()(state),
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

export default compose<any>(
	withSetup,
	connect(mapStateToProps, mapDispatchToProps),
)(CardActions);

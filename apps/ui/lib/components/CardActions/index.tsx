import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../bindactioncreators';
import { actionCreators, selectors } from '../../store';
import { withSetup } from '../SetupProvider';
import CardActions, {
	StateProps,
	DispatchProps,
	OwnProps,
} from './CardActions';

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes()(state),
		user: selectors.getCurrentUser()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(withSetup(CardActions));

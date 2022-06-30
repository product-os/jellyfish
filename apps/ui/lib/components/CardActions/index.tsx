import _ from 'lodash';
import { connect } from 'react-redux';
import { compose } from 'redux';
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
		relationships: selectors.getRelationships()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default compose<any>(
	withSetup,
	connect<StateProps, DispatchProps, OwnProps>(
		mapStateToProps,
		mapDispatchToProps,
	),
)(CardActions);

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
	const user = selectors.getCurrentUser()(state);
	if (!user) {
		throw new Error('Cannot render without a user');
	}
	return {
		types: selectors.getTypes()(state),
		user,
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

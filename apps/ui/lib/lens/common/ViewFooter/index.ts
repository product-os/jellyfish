import _ from 'lodash';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors } from '../../../store';
import { withSetup } from '../../../components';
import {
	ViewFooter as InnerViewFooter,
	OwnProps,
	DispatchProps,
	StateProps,
} from './ViewFooter';
import { withChannelContext } from '../../../hooks';

const mapStateToProps = (state): StateProps => {
	const user = selectors.getCurrentUser()(state);

	if (!user) {
		throw new Error('Cannot render without a user');
	}

	return {
		user,
		relationships: selectors.getRelationships()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export const ViewFooter = compose(
	withChannelContext,
	withSetup,
	connect<StateProps, DispatchProps, OwnProps>(
		mapStateToProps,
		mapDispatchToProps,
	),
)(InnerViewFooter);

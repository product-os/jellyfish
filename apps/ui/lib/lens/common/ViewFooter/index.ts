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
	return {
		user: selectors.getCurrentUser()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export const ViewFooter = compose(
	withSetup,
	withChannelContext,
	connect<StateProps, DispatchProps, OwnProps>(
		mapStateToProps,
		mapDispatchToProps,
	),
)(InnerViewFooter);

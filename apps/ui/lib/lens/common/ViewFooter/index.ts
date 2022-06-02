import _ from 'lodash';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators } from '../../../store';
import {
	ViewFooter as InnerViewFooter,
	OwnProps,
	DispatchProps,
} from './ViewFooter';
import { withChannelContext } from '../../../hooks';

const mapStateToProps = () => {
	return {};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(_.pick(actionCreators, ['addCard']), dispatch),
	};
};

export const ViewFooter = compose(
	withChannelContext,
	connect<{}, DispatchProps, OwnProps>(mapStateToProps, mapDispatchToProps),
)(InnerViewFooter);

import _ from 'lodash';
import { connect } from 'react-redux';
import { compose, bindActionCreators } from 'redux';
import { actionCreators } from '../../../core';
import { ViewFooter as InnerViewFooter } from './ViewFooter';
import { withChannelContext } from '../../../hooks';

const mapStateToProps = () => {
	return {};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(_.pick(actionCreators, ['addCard']), dispatch),
	};
};

export const ViewFooter = compose(
	withChannelContext,
	connect(mapStateToProps, mapDispatchToProps),
)(InnerViewFooter);

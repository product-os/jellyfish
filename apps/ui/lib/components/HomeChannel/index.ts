import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { withRouter } from 'react-router-dom';
import { withTheme } from 'styled-components';
import { withResponsiveContext } from '../../hooks/use-responsive-context';
import { actionCreators, selectors } from '../../store';
import HomeChannel from './HomeChannel';

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels()(state),
		codename: selectors.getAppCodename()(state),
		orgs: selectors.getOrgs()(state),
		types: selectors.getTypes()(state),
		mentions: selectors.getInboxViewData()(state),
		subscriptions: selectors.getSubscriptions()(state),
		activeLoop: selectors.getActiveLoop()(state),
		isChatWidgetOpen: selectors.getChatWidgetOpen()(state),
		user: selectors.getCurrentUser()(state),
		homeView: selectors.getHomeView()(state),
		version: selectors.getAppVersion()(state),
		viewNotices: selectors.getViewNotices()(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'loadViewData',
				'logout',
				'removeViewNotice',
				'updateUser',
				'queryAPI',
				'removeView',
				'setChatWidgetOpen',
				'setDefault',
				'setSidebarExpanded',
			]),
			dispatch,
		),
	};
};

export default redux.compose(
	connect(mapStateToProps, mapDispatchToProps),
	withTheme,
	withRouter,
	withResponsiveContext,
)(HomeChannel);

import _ from 'lodash';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { withRouter } from 'react-router-dom';
import { withTheme } from 'styled-components';
import memoize from 'memoize-one';
import { withResponsiveContext } from '@balena/jellyfish-ui-components';
import { actionCreators, selectors } from '../../core';
import HomeChannel from './HomeChannel';

const getTarget = memoize((channel) => {
	return _.get(channel, ['data', 'head', 'id']);
});

const mapStateToProps = (state, ownProps) => {
	const target = getTarget(ownProps.channel);
	const user = selectors.getCurrentUser(state);
	return {
		channels: selectors.getChannels(state),
		codename: selectors.getAppCodename(state),
		orgs: selectors.getOrgs(state),
		tail: target ? selectors.getViewData(state, target) : null,
		types: selectors.getTypes(state),
		mentions: selectors.getInboxViewData(state),
		subscriptions: selectors.getSubscriptions(state),
		bookmarks: target
			? selectors.getViewData(state, `${target}-bookmarks`)
			: null,
		repos: target ? selectors.getViewData(state, `${target}-repos`) : null,
		activeLoop: selectors.getActiveLoop(state),
		isChatWidgetOpen: selectors.getChatWidgetOpen(state),
		user,
		homeView: selectors.getHomeView(state),
		version: selectors.getAppVersion(state),
		viewNotices: selectors.getViewNotices(state),
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

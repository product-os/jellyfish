import _ from 'lodash';
import React from 'react';
import { Flex } from 'rendition';
import { Route, Switch } from 'react-router-dom';
import manifestJSON from '../manifest.json';
import PageTitle from './PageTitle';
import HomeChannel from './HomeChannel';
import { createLazyComponent } from './SafeLazy';
import { useSelector, useStore } from 'react-redux';
import { actionCreators, selectors } from '../core';

const RouteHandler = createLazyComponent(
	() => import(/* webpackChunkName: "route-handler" */ './RouteHandler'),
);

const Oauth = createLazyComponent(
	() => import(/* webpackChunkName: "oauth" */ './Oauth'),
);

const ChatWidgetSidebar = createLazyComponent(
	() =>
		import(/* webpackChunkName: "chat-widget-sidebar" */ './ChatWidgetSidebar'),
);

const Authorized = () => {
	const [home] = useSelector(selectors.getChannels);
	const isChatWidgetOpen = useSelector(selectors.getChatWidgetOpen);
	const store = useStore();

	const handleChatWidgetClose = React.useCallback(() => {
		actionCreators.setChatWidgetOpen(false)(store.dispatch, store.getState);
	}, []);

	return (
		<React.Fragment>
			<Flex
				flex="1"
				style={{
					height: '100%',
				}}
			>
				<PageTitle siteName={manifestJSON.name} />
				<HomeChannel channel={home} />

				<Switch>
					<Route path="/oauth/:integration" component={Oauth} />
					<Route path="/*" component={RouteHandler} />
				</Switch>
			</Flex>

			{isChatWidgetOpen && (
				<ChatWidgetSidebar onClose={handleChatWidgetClose} />
			)}
		</React.Fragment>
	);
};

export default Authorized;
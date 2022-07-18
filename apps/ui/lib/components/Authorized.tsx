import _ from 'lodash';
import React from 'react';
import { Flex } from 'rendition';
import { Route, Switch } from 'react-router-dom';
import manifestJSON from '../manifest.json';
import PageTitle from './PageTitle';
import HomeChannel from './HomeChannel';
import { createLazyComponent } from './SafeLazy';
import { useSelector, useStore } from 'react-redux';
import { actionCreators, selectors } from '../store';
import NavBar from './NavBar';

const RouteHandler = createLazyComponent(
	() => import(/* webpackChunkName: "route-handler" */ './RouteHandler'),
);

const ChatWidgetSidebar = createLazyComponent(
	() =>
		import(/* webpackChunkName: "chat-widget-sidebar" */ './ChatWidgetSidebar'),
);

const Authorized = () => {
	const [home] = useSelector(selectors.getChannels());
	const isChatWidgetOpen = useSelector(selectors.getChatWidgetOpen());
	const store = useStore();

	const handleChatWidgetClose = React.useCallback(() => {
		actionCreators.setChatWidgetOpen(false)(store.dispatch, store.getState);
	}, []);

	return (
		<React.Fragment>
			<Flex
				flex="1"
				flexDirection="column"
				style={{
					height: '100%',
				}}
			>
				<NavBar />
				<PageTitle siteName={manifestJSON.name} />

				<Flex flex="1" style={{ minHeight: 0 }}>
					<HomeChannel channel={home} />

					<Switch>
						<Route path="/*" component={RouteHandler} />
					</Switch>
				</Flex>
			</Flex>

			{isChatWidgetOpen && (
				<ChatWidgetSidebar onClose={handleChatWidgetClose} />
			)}
		</React.Fragment>
	);
};

export default Authorized;

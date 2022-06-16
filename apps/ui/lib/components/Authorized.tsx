import _ from 'lodash';
import React from 'react';
import { Flex } from 'rendition';
import { Route, Switch } from 'react-router-dom';
import manifestJSON from '../manifest.json';
import PageTitle from './PageTitle';
import HomeChannel from './HomeChannel';
import { createLazyComponent } from './SafeLazy';
import { useDispatch, useSelector } from 'react-redux';
import { actionCreators, selectors } from '../store';

const RouteHandler = createLazyComponent(
	() => import(/* webpackChunkName: "route-handler" */ './RouteHandler'),
);

const ChatWidgetSidebar = createLazyComponent(
	() =>
		import(/* webpackChunkName: "chat-widget-sidebar" */ './ChatWidgetSidebar'),
);

const Livechat = createLazyComponent(
	() => import(/* webpackChunkName: "livechat" */ './Livechat'),
);

const Layout = ({ children }) => {
	const [home] = useSelector(selectors.getChannels());
	const isChatWidgetOpen = useSelector(selectors.getChatWidgetOpen());
	const dispatch = useDispatch();

	const handleChatWidgetClose = React.useCallback(() => {
		dispatch(actionCreators.setChatWidgetOpen(false));
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
				{children}
			</Flex>

			{isChatWidgetOpen && (
				<ChatWidgetSidebar onClose={handleChatWidgetClose} />
			)}
		</React.Fragment>
	);
};

const RouteHandlerWithLayout = (props) => {
	return (
		<Layout>
			<RouteHandler {...props} />
		</Layout>
	);
};

const Authorized = () => {
	return (
		<Switch>
			<Route path="/livechat" component={Livechat} />
			<Route path="/*" component={RouteHandlerWithLayout} />
		</Switch>
	);
};

export default Authorized;

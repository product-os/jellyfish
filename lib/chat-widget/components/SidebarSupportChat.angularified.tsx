import * as React from 'react';
import { react2angular } from 'react2angular';
import { connect } from '~/angular/services/redux-connector-hoc';
import { Provider } from '~/components/ThemedProvider';
import { modules } from '~/redux-modules';
import { SidebarSupportChat } from './SidebarSupportChat';

const ConnectedSupportChat = connect(state => ({
	token: modules.auth.selectors.token(state)!,
	apiHost: window.SUPPORT_CHAT_API_HOST,
}))(props =>
	props.token ? (
		<Provider>
			<SidebarSupportChat {...props} />
		</Provider>
	) : null,
);

export const ngSidebarSupportChat = react2angular(ConnectedSupportChat);

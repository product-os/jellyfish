/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';

const channelContext = React.createContext(null);

export const ChannelContextProvider: React.FunctionComponent<any> = ({
	channel,
	children,
}) => {
	return (
		<channelContext.Provider value={channel}>
			{children}
		</channelContext.Provider>
	);
};

export const withChannelContext = (Component) => {
	return (props) => {
		return (
			<channelContext.Consumer>
				{(context) => {
					return <Component channel={context} {...props} />;
				}}
			</channelContext.Consumer>
		);
	};
};

export const useChannelContext = () => {
	return React.useContext(channelContext);
};

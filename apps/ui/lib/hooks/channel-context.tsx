import type { Contract } from 'autumndb';
import React from 'react';
import type { ChannelContract } from '../types';

const channelContext = React.createContext(null);

export interface ChannelContextProps {
	channelData: { channel: ChannelContract; head: null | Contract };
}

export const ChannelContextProvider: React.FunctionComponent<any> = ({
	channelData,
	children,
}) => {
	return (
		<channelContext.Provider value={channelData}>
			{children}
		</channelContext.Provider>
	);
};

export const withChannelContext = (Component) => {
	return (props) => {
		return (
			<channelContext.Consumer>
				{(context) => {
					return <Component channelData={context} {...props} />;
				}}
			</channelContext.Consumer>
		);
	};
};

export const useChannelContext = () => {
	return React.useContext(channelContext);
};

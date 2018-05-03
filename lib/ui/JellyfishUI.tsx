import * as React from 'react';
import { Flex, Provider } from 'rendition';
import ChannelRenderer from './components/ChannelRenderer';
import { HomeChannel } from './components/HomeChannel';
import { Login } from './components/Login';
import { Notifications } from './components/Notifications';
import { Splash } from './components/Splash';
import { connectComponent, ConnectedComponentProps } from './services/helpers';

class UI extends React.Component<ConnectedComponentProps, {}> {
	public render() {
		if (this.props.appState.status === 'initializing') {
			return <Splash />;
		}

		if (this.props.appState.status === 'unauthorized') {
			return (
				<Provider>
					<Login />
					<Notifications />
				</Provider>
			);
		}

		return (
			<Provider style={{height: '100%'}}>
				<Flex flex='1' style={{overflowX: 'auto', height: '100%'}}>
					{this.props.appState.channels.map((channel, index) => {
						if (index === 0) {
							return <HomeChannel
								key={channel.id}
								channel={channel}
							/>;
						}

						return <ChannelRenderer
							key={channel.id}
							channel={channel}
						/>;
					})}
				</Flex>
				<Notifications />
			</Provider>
		);
	}
}

export const JellyfishUI = connectComponent(UI);

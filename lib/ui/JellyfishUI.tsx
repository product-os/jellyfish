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

		const [ home, next ] = this.props.appState.channels;

		return (
			<Provider style={{height: '100%'}}>
				<Flex flex='1' style={{ height: '100%'}}>
					<HomeChannel channel={home} />

					{!!next && <ChannelRenderer channel={next} />}
				</Flex>

				<Notifications />
			</Provider>
		);
	}
}

export const JellyfishUI = connectComponent(UI);

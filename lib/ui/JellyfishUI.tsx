import * as React from 'react';
import { connect } from 'react-redux';
import { Flex, Provider } from 'rendition';
import { AppStatus, Channel } from '../Types';
import ChannelRenderer from './components/ChannelRenderer';
import { HomeChannel } from './components/HomeChannel';
import { Login } from './components/Login';
import { Notifications } from './components/Notifications';
import { Splash } from './components/Splash';
import { selectors, StoreState } from './core/store';

// Register the mermaid and markdown widgets for rendition forms
import 'rendition/dist/extra/Form/markdown';
import 'rendition/dist/extra/Form/mermaid';

interface UIProps {
	channels: Channel[];
	status: AppStatus;
}

class UI extends React.Component<UIProps, {}> {
	public render(): React.ReactElement<any> {
		if (this.props.status === 'initializing') {
			return <Splash />;
		}

		if (this.props.status === 'unauthorized') {
			return (
				<Provider>
					<Login />
					<Notifications />
				</Provider>
			);
		}

		const [ home, next ] = this.props.channels;

		return (
			<Provider
				style={{
					height: '100%',
					fontSize: 14,
				}}
			>
				<Flex flex="1" style={{ height: '100%'}}>
					<HomeChannel channel={home} />

					{!!next && <ChannelRenderer channel={next} />}
				</Flex>

				<Notifications />
			</Provider>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state),
	};
};

export const JellyfishUI = connect(mapStateToProps)(UI);

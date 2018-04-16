import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Flex, Provider } from 'rendition';
import { JellyfishState } from '../Types';
import ChannelRenderer from './components/ChannelRenderer';
import HomeChannel from './components/HomeChannel';
import Login from './components/Login';
import * as sdk from './services/sdk';
import { actionCreators } from './services/store';
import './services/url-manager';

(window as any).sdk = sdk;

interface AppProps {
	channels: JellyfishState['channels'];
	session: JellyfishState['session'];
	actions: typeof actionCreators;
}

class App extends React.Component<AppProps, {}> {
	private channelDOMElement: HTMLDivElement;

	constructor(props: AppProps) {
		super(props);

		this.state = {};
	}

	public componentDidUpdate(prevProps: AppProps) {
		if (!prevProps.session && this.props.session) {
			// If we have a session token available load all the channels
			this.props.channels.forEach(this.props.actions.loadChannelData);
		}
	}

	public render() {
		if (!this.props.session) {
			return (
				<Provider>
					<Login />
				</Provider>
			);
		}

		return (
			<Provider style={{height: '100%'}}>
				<Flex flexDirection='column' style={{height: '100%'}}>
					<Flex flex='1' style={{overflowX: 'auto'}}
						innerRef={(element) => this.channelDOMElement = element}>
						{this.props.channels.map((channel, index) => {
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
				</Flex>
			</Provider>
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	channels: state.channels,
	session: state.session,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(App);

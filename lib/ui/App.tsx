import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Flex, Provider } from 'rendition';
import { JellyfishState } from '../Types';
import ChannelRenderer from './components/ChannelRenderer';
import HomeChannel from './components/HomeChannel';
import Login from './components/Login';
import Notifications from './components/Notifications';
import { debug } from './services/helpers';
import * as sdk from './services/sdk';
import { actionCreators, ready as storeReady } from './services/store';
import './services/url-manager';

(window as any).sdk = sdk;

interface AppProps {
	channels: JellyfishState['channels'];
	session: JellyfishState['session'];
	actions: typeof actionCreators;
	authorized: JellyfishState['authorized']
}

class App extends React.Component<AppProps, {}> {
	private channelDOMElement: HTMLElement;
	private initialized: boolean = false;

	constructor(props: AppProps) {
		super(props);

		this.state = {};

		storeReady.then(() => {
			// If the app is not authorized, but an authToken is available, try logging
			// in with the token. This indicates that the app has been reloaded whilst
			// an active session was running
			const token = _.get(this.props, 'session.authToken');
			if (!this.props.authorized && token) {
				debug(`Logging in with token ${token}`);

				sdk.auth.loginWithToken(token)
					.then((freshToken) => {
						this.props.actions.setAuthToken(freshToken);
						this.props.actions.setAuthorized();

						return null;
					})
					.catch((error: Error) => {
						debug(`Login with token failed`, error);
						this.props.actions.logout();
					});
			}
		});
	}

	public componentDidUpdate(prevProps: AppProps) {
		if (!this.initialized && !prevProps.authorized && this.props.authorized) {
			// If we have a session token available load all the channels
			this.props.channels.forEach(this.props.actions.loadChannelData);
		}
	}

	public render() {
		if (!this.props.authorized) {
			return (
				<Provider>
					<Login />
					<Notifications />
				</Provider>
			);
		}

		return (
			<Provider style={{height: '100%'}}>
				<Flex flex='1' style={{overflowX: 'auto', height: '100%'}}
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
				<Notifications />
			</Provider>
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	channels: state.channels,
	session: state.session,
	authorized: state.authorized,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(App);

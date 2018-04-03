import * as Promise from 'bluebird';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Flex, Provider } from 'rendition';
import { Channel, JellyfishState } from '../Types';
import ChannelRenderer from './components/ChannelRenderer';
import HomeChannel from './components/HomeChannel';
import Login from './components/Login';
import { createChannel } from './services/helpers';
import * as sdk from './services/sdk';
import { actionCreators } from './services/store';

(window as any).sdk = sdk;

const loadChannelData = (channel: Channel): Promise<Channel['data']> => {
	if (channel.data.type === 'view') {
		return Promise.props({
			...channel.data,
			head: sdk.getCard(channel.data.card),
			tail: sdk.queryView(channel.data.card),
		});
	}
	if (channel.data.type === 'pensieve') {
		return sdk.getCard(channel.data.card)
		.then(pensieveCard =>
			Promise.props({
				...channel.data,
				head: pensieveCard,
				tail: sdk.query({
					type: 'object',
					properties: {
						type: {
							const: 'pensieve-entry',
						},
						data: {
							type: 'object',
							properties: {
								target: {
									const: pensieveCard.id,
								},
							},
							additionalProperties: true,
						},
					},
					additionalProperties: true,
				}),
			}));
	}

	return Promise.resolve(channel.data);
};

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

		this.loadAllChannels();
	}

	public componentDidUpdate(prevProps: AppProps) {
		if (!prevProps.session && this.props.session) {
			this.loadAllChannels();
		}
	}

	public loadAllChannels(): Promise<any> {
		return Promise.try<any>(() => {
			// Only run requests if there is session data available
			if (this.props.session) {
				return Promise.all(
					this.props.channels.map(channel => this.loadChannel(channel)),
				);
			}
		});
	}

	public loadChannel(channel: Channel) {
		return loadChannelData(channel)
			.then((channelData) => {
				this.props.actions.updateChannel(_.assign(channel, { data: channelData }));
			})
			.catch((error: Error) => {
					const clone = _.cloneDeep(channel);
					clone.data.error = error;
					this.props.actions.updateChannel(clone);
			});
	}

	public openChannel(data: Channel['data'], triggerIndex: number) {
		const newChannel = createChannel(data);

		// if the triggering channel is not the last channel, remove trailing
		// channels. This creates a 'breadcrumb' effect when navigating channels
		const shouldTrim = triggerIndex + 1 < this.props.channels.length;
		if (shouldTrim) {
			this.props.actions.trimChannels(triggerIndex + 1);
		}
		this.props.actions.addChannel(newChannel);

		this.loadChannel(newChannel)
		.then(() => {
			// If a channel has been added, once its data is loaded, scroll to the right
			if (!shouldTrim) {
				this.channelDOMElement.scrollLeft = this.channelDOMElement.clientWidth;
			}
		});
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
									refresh={() => this.loadChannel(channel)}
									openChannel={(c: Channel['data']) => this.openChannel(c, index)}
								/>;
							}

							return <ChannelRenderer
								key={channel.id}
								channel={channel}
								refresh={() => this.loadChannel(channel)}
								openChannel={c => this.openChannel(c, index)}
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

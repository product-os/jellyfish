import * as _ from 'lodash';
import * as React from 'react';
import { Box, Flex, Provider, Text } from 'rendition';
import { Card } from '../Types';
import * as sdk from './services/sdk';

// Load renderers
import CardRenderer, { CardRendererProps } from './components/CardRenderer';
import ViewRenderer from './components/ViewRenderer';

(window as any).sdk = sdk;

// Selects an appropriate renderer for a card
const Renderer = (props: CardRendererProps) => {
	if (props.card.type === 'view') {
		return <ViewRenderer {...props} />;
	}
	return <CardRenderer {...props} />;
};

// A null value indicates that the channel is loading data, and an Error value
// indicates that the channel should display an error
type Channel = null | Error | Card[];

interface AppState {
	channels: Channel[];
}

export default class App extends React.Component<{}, AppState> {
	constructor() {
		super({});

		this.state = {
			channels: [],
		};

		sdk.get({
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'view',
				},
			},
			required: ['type'],
			additionalProperties: true,
		})
		.then((cards) => {
			this.setState({ channels: [cards] });
			console.log('GOT VIEWS', cards);
		});
	}

	public openChannel(getChannelData: Promise<Card[]>) {
		const channelIndex = this.state.channels.length;
		this.setState((prevState) => ({
			channels: prevState.channels.concat(null),
		}));

		getChannelData.then(
			(cards) => this.setState((prevState) => {
				prevState.channels.splice(channelIndex, 1, cards);
				return {
					channels: prevState.channels,
				};
			}),
		)
		.catch(
			(error: Error) => this.setState((prevState) => {
				prevState.channels.splice(channelIndex, 1, error);
				return {
					channels: prevState.channels,
				};
			}),
		);

	}

	public render() {
		console.log(this.state);
		return (
			<Provider>
				<Flex>
					{this.state.channels.map((channel) => (
						<Box p={3} style={{ borderRight: '1px solid #ccc' }}>
							{channel === null && <i className='fas fa-cog fa-spin' />}
							{!_.isArray(channel) && channel !== null && <Text>{`${channel}`}</Text>}
							{_.isArray(channel) && channel.map(card =>
								<Renderer card={card} openChannel={p => this.openChannel(p)} />,
							)}
						</Box>
					))}
				</Flex>
			</Provider>
		);
	}
}

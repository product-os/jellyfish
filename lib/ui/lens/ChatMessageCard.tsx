import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
} from 'rendition';
import { JellyfishState, Lens, RendererProps } from '../../Types';
import ChatMessage from '../components/ChatMessage';
import { createChannel } from '../services/helpers';
import * as sdk from '../services/sdk';
import { actionCreators } from '../services/store';

interface CardListProps extends RendererProps {
	actions: typeof actionCreators;
	session: JellyfishState['session'];
	allChannels: JellyfishState['channels'];
}

interface CardListState {
}

class CardList extends React.Component<CardListProps, CardListState> {
	constructor(props: CardListProps) {
		super(props);

		this.state = {
			newMessage: '',
		};
	}

	public createThread() {
		sdk.addCard({
			type: 'chat-thread',
		})
		.then(({ results }) => {
			const threadId = results.data;

			this.openChannel(threadId);
		})
	}

	public openChannel(target: string) {
		const newChannel = createChannel({
			target,
			parentChannel: this.props.channel.id,
		});

		this.props.actions.addChannel(newChannel);
		this.props.actions.loadChannelData(newChannel);
	}

	public threadOpen(target: string) {
		return _.some(this.props.allChannels, (channel) => {
			return channel.data.target === target;
		});
	}

	public render() {
		const { tail } = this.props;

		return (
			<React.Fragment>
				<Box px={3} flex='1' style={{overflowY: 'auto'}}>
					{!!tail && _.map(tail, (card) => {

						return (
							<Box p={3} bg={this.threadOpen(card.data.target) ? '#eee' : '#fff' } >
								<ChatMessage card={card}
									openChannel={(target) => this.openChannel(target)} />
							</Box>
						);
					})}
				</Box>

				<Flex p={3}
					style={{borderTop: '1px solid #eee'}}
					justify='flex-end'
				>
					<Button success onClick={() => this.createThread()}>
						Start a new thread
					</Button>
				</Flex>
			</React.Fragment>
		);
	}

}

const mapStateToProps = (state: JellyfishState) => ({
	session: state.session,
	allChannels: state.channels,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-chat-message-card',
	type: 'lens',
	name: 'Chat message card lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(CardList),
		icon: 'address-card',
		type: 'chat-message',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'chat-message',
					},
				},
				required: [ 'type' ],
			},
		},
	},
};

export default lens;

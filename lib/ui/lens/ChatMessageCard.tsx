import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Textarea,
} from 'rendition';
import { JellyfishState, Lens, RendererProps } from '../../Types';
import ChatMessage from '../components/ChatMessage';
import { createChannel, getCurrentTimestamp } from '../services/helpers';
import * as sdk from '../services/sdk';
import { actionCreators } from '../services/store';

interface CardListProps extends RendererProps {
	actions: typeof actionCreators;
	session: JellyfishState['session'];
	allChannels: JellyfishState['channels'];
}

interface CardListState {
	newMessage: string;
}

class CardList extends React.Component<CardListProps, CardListState> {
	constructor(props: CardListProps) {
		super(props);

		this.state = {
			newMessage: '',
		};
	}

	public createThread(e: React.KeyboardEvent<HTMLElement>) {
		e.preventDefault();
		const { newMessage } = this.state;

		this.setState({ newMessage: '' });

		sdk.addCard({
			type: 'chat-thread',
		})
		.then(({ results }) => {
			const threadId = results.data;

			return sdk.addCard({
				type: 'chat-message',
				data: {
					timestamp: getCurrentTimestamp(),
					target: threadId,
					actor: this.props.session!.user!.id,
					payload: {
						message: newMessage,
					},
				},
			});
		})
		.then(() => this.refresh());
	}

	public refresh() {
		this.props.actions.loadChannelData(this.props.channel);
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
			<Box>
				{!!tail && _.map(tail, (card) => {

					return (
						<Box p={3} bg={this.threadOpen(card.data.target) ? '#eee' : '#fff' } >
							<ChatMessage card={card}
								openChannel={(target) => this.openChannel(target)} />
						</Box>
					);
				})}
				<Box p={3} style={{position: 'absolute', left: 0, bottom: 0, right: 0, borderTop: '1px solid #eee'}}>
					<Textarea
						rows={1}
						value={this.state.newMessage}
						onChange={(e) => this.setState({ newMessage: e.target.value })}
						onKeyPress={(e) => e.key === 'Enter' && this.createThread(e)}
						placeholder='Type to start a new thread...' />
				</Box>
			</Box>
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

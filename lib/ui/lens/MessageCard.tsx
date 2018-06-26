import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
} from 'rendition';
import { Card, Lens, RendererProps } from '../../Types';
import { sdk } from '../app';
import EventCard from '../components/Event';
import { connectComponent, ConnectedComponentProps } from '../services/connector';
import { createChannel } from '../services/helpers';

interface CardListProps extends RendererProps, ConnectedComponentProps {}

interface CardListState {}

class CardList extends React.Component<CardListProps, CardListState> {
	private scrollArea: HTMLElement;
	private shouldScroll: boolean = true;

	constructor(props: CardListProps) {
		super(props);

		this.state = {
			newMessage: '',
		};

		setTimeout(() => this.scrollToBottom(), 1000);
	}

	public createThread = () => {
		sdk.card.create({
			type: 'thread',
		})
			.then((thread) => {
				this.openChannel(thread.id, thread);
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message);
			});
	}

	public componentWillReceiveProps() {
		if (!this.scrollArea) {
			return;
		}

		// Only set the scroll flag if the scroll area is already at the bottom
		this.shouldScroll = this.scrollArea.scrollTop === this.scrollArea.scrollHeight - this.scrollArea.offsetHeight;
	}

	public componentDidUpdate() {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom();
	}

	public scrollToBottom() {
		if (!this.scrollArea) {
			return;
		}

		if (this.shouldScroll) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
		}
	}

	public openChannel = (target: string, card?: Card) => {
		// If a card is not provided, see if a matching card can be found from this
		// component's state/props
		if (!card) {
			card = _.find(this.props.tail || [], { id: target });
		}
		const newChannel = createChannel({
			target,
			head: card,
			parentChannel: this.props.channel.id,
		});

		this.props.actions.addChannel(newChannel);
		this.props.actions.loadChannelData(newChannel);
	}

	public threadOpen(target: string) {
		return _.some(this.props.appState.channels, (channel) => {
			return channel.data.target === target;
		});
	}

	public setScrollArea = (ref: HTMLElement) => {
		this.scrollArea = ref;
	}

	public render() {
		const { tail } = this.props;

		return (
			<React.Fragment>
				<Box innerRef={this.setScrollArea} flex="1" style={{overflowY: 'auto'}}>
					{!!tail && _.map(tail, (card) => {

						return (
							<Box p={3} bg={this.threadOpen(card.data.target) ? '#eee' : '#fff'} >
								<EventCard
									card={card}
									users={this.props.appState.allUsers}
									openChannel={this.openChannel}
								/>
							</Box>
						);
					})}
				</Box>

				<Flex
					p={3}
					style={{borderTop: '1px solid #eee'}}
					justify="flex-end"
				>
					<Button success={true} onClick={this.createThread}>
						Start a new thread
					</Button>
				</Flex>
			</React.Fragment>
		);
	}
}

const lens: Lens = {
	slug: 'lens-message-card',
	type: 'lens',
	name: 'Chat message card lens',
	data: {
		renderer: connectComponent(CardList),
		icon: 'address-card',
		type: 'message',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'message',
					},
				},
				required: [ 'type' ],
			},
		},
	},
};

export default lens;

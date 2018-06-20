import { circularDeepEqual } from 'fast-equals';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
} from 'rendition';
import styled from 'styled-components';
import { Card, Lens, RendererProps } from '../../Types';
import { sdk } from '../app';
import EventCard from '../components/Event';
import { TailStreamer } from '../components/TailStreamer';
import { connectComponent, ConnectedComponentProps } from '../services/connector';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	borderRight: 1px solid #ccc;
	min-width: 350px;
`;

interface RendererState {
	tail: null | Card[];
	newMessage: string;
	showNewCardModal: boolean;
}

interface DefaultRendererProps extends RendererProps, ConnectedComponentProps {
	tail?: Card[];
	type?: Card;
}

// Default renderer for a card and a timeline
export class Renderer extends TailStreamer<DefaultRendererProps, RendererState> {
	private scrollArea: HTMLElement | null;
	private shouldScroll: boolean = true;

	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			tail: null,
			newMessage: '',
			showNewCardModal: false,
		};

		this.setupStream(this.props.tail || []);

		setTimeout(() => this.scrollToBottom(), 1000);
	}

	public componentWillUpdate(nextProps: DefaultRendererProps) {
		if (!circularDeepEqual(nextProps.tail, this.props.tail)) {
			this.setupStream(nextProps.tail || []);
		}

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

	public setupStream(headCards: Card[]) {
		const headCardIds = _.map(headCards, 'id');

		if (!headCardIds.length) {
			return this.setTail([]);
		}

		const querySchema: JSONSchema6 = {
			type: 'object',
			properties: {
				type: {
					// Don't incluide action request cards, as it just add's noise
					not: {
						const: 'action-request',
					},
				},
				data: {
					type: 'object',
					properties: {
						target: {
							enum: headCardIds,
						},
					},
					required: [ 'target' ],
					additionalProperties: true,
				},
			},
			required: [ 'type', 'data' ],
			additionalProperties: true,
		};

		this.streamTail(querySchema);
	}

	public scrollToBottom() {
		if (!this.scrollArea) {
			return;
		}

		if (this.shouldScroll) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
		}
	}

	public openChannel = (target: string) => {
		const newChannel = createChannel({
			target,
			parentChannel: this.props.channel.id,
		});

		this.props.actions.addChannel(newChannel);
		this.props.actions.loadChannelData(newChannel);
	}

	public addThread = (e: React.MouseEvent<HTMLElement>) => {
		e.preventDefault();

		const { head } = this.props.channel.data;

		if (!head) {
			return;
		}

		const schema = getViewSchema(head);

		if (!schema) {
			return;
		}

		const cardData = getUpdateObjectFromSchema(schema);

		cardData.type = 'thread';
		if (!cardData.data) {
			cardData.data = {};
		}

		return sdk.card.create(cardData as Card)
			.then((threadId) => {
				this.openChannel(threadId);
				return null;
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message);
			});
	}


	public render() {
		const { head } = this.props.channel.data;
		const timelineCards = _.sortBy(this.state.tail, 'data.timestamp');
		// Give each headcard a timestamp using the first matching timeline card
		const headCards = _.map(this.props.tail, card => {
			const timestamp = _.get(_.find(timelineCards, (x) => x.data.target === card.id), 'data.timestamp');
			_.set(card, 'data.timestamp', timestamp);
			return card;
		});
		const channelTarget = this.props.channel.data.target;

		const tail: Card[] | null = timelineCards.length ? _.sortBy(headCards.concat(timelineCards), 'data.timestamp') : null;

		return (
			<Column flexDirection="column">
				<div
					ref={(ref) => this.scrollArea = ref}
					style={{
						flex: 1,
						padding: 16,
						overflowY: 'auto',
					}}
				>
					{(!!tail && tail.length > 0) && _.map(tail, card =>
						<Box key={card.id} py={2} style={{borderBottom: '1px solid #eee'}}>
							<EventCard
								users={this.props.appState.allUsers}
								openChannel={
									card.data && card.data.target !== channelTarget ? this.openChannel : undefined
								}
								card={card}
							/>
						</Box>,
					)}
				</div>

				{head && head.slug !== 'view-my-alerts' && head.slug !== 'view-my-mentions' &&
					<Flex
						p={3}
						style={{borderTop: '1px solid #eee'}}
						justify="flex-end"
					>
						<Button className="btn--add-thread" success={true} onClick={this.addThread}>
							Add a Chat Thread
						</Button>
					</Flex>
				}
			</Column>
		);
	}
}

const lens: Lens = {
	slug: 'lens-interleaved',
	type: 'lens',
	name: 'Interleaved lens',
	data: {
		icon: 'address-card',
		renderer: connectComponent(Renderer),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
					},
				},
			},
		},
	},
};

export default lens;

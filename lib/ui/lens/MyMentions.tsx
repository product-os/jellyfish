import { circularDeepEqual } from 'fast-equals';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Flex,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { Card, Lens, RendererProps } from '../../Types';
import EventCard from '../components/Event';
import Icon from '../components/Icon';
import { TailStreamer } from '../components/TailStreamer';
import { connectComponent, ConnectedComponentProps, createChannel } from '../services/helpers';

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

		this.setupStream();

		setTimeout(() => this.scrollToBottom(), 1000);
	}

	public componentWillUpdate(nextProps: DefaultRendererProps) {
		if (!circularDeepEqual(nextProps.tail, this.props.tail)) {
			this.setupStream();
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

	public setupStream() {
		const headCardIds = _.map(this.props.tail, 'id');

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

	public render() {
		const timelineCards = _.sortBy(this.state.tail, 'data.timestamp');
		// Give each headcard a timestamp using the first matching timeline card
		const headCards = _.map(this.props.tail, card => {
			card.data.timestamp = _.get(_.find(timelineCards, (x) => x.data.target === card.id), 'data.timestamp');
			return card;
		});
		const channelTarget = this.props.channel.data.target;

		const tail: Card[] = _.sortBy(headCards.concat(timelineCards), 'data.timestamp');

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
					{!tail && <Icon name="cog fa-spin" />}

					{(!!tail && tail.length > 0) && _.map(tail, card =>
						<Box key={card.id} py={3} style={{borderBottom: '1px solid #eee'}}>
							<EventCard
								users={this.props.appState.allUsers}
								openChannel={
									card.data && card.data.target !== channelTarget ? this.openChannel : undefined
								}
								card={card}
							/>
						</Box>,
					)}

					{(!!tail && tail.length === 0) &&
						<Txt color="#ccc">
							<em>You haven't been mentioned in any conversations yet</em>
						</Txt>
					}
				</div>
			</Column>
		);
	}
}

const lens: Lens = {
	slug: 'lens-my-mentions',
	type: 'lens',
	name: 'My mentions lens',
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

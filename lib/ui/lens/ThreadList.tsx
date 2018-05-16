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
import { JellyfishStream } from '../../sdk/stream';
import { sdk } from '../app';
import EventCard from '../components/Event';
import Icon from '../components/Icon';
import { TailStreamer } from '../components/TailStreamer';
import { connectComponent, ConnectedComponentProps, createChannel, getCurrentTimestamp } from '../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	borderRight: 1px solid #ccc;
	min-width: 350px;
`;

interface RendererState {
	tail: null | Card[];
	threads: Card[];
	newMessage: string;
}

interface DefaultRendererProps extends RendererProps, ConnectedComponentProps {
	tail?: Card[];
}

// Default renderer for a card and a timeline
export class Renderer extends TailStreamer<DefaultRendererProps, RendererState> {
	private scrollArea: HTMLElement;
	private shouldScroll: boolean = true;
	private threadStream: JellyfishStream;

	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			threads: [],
			tail: null,
			newMessage: '',
		};

		this.setupStreams();

		setTimeout(() => this.scrollToBottom(), 1000);
	}

	public componentWillUnmount() {
		if (this.stream) {
			this.stream.destroy();
		}
		if (this.threadStream) {
			this.threadStream.destroy();
		}
	}

	public setupStreams() {
		if (this.threadStream) {
			this.threadStream.destroy();
		}

		const setThreads = (threads: Card[]) => {
			if (threads.length === 0) {
				return;
			}

			this.setState({ threads });

			this.streamTail({
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							target: threads.length > 1 ? {
								enum: _.map(threads, 'id'),
							} : {
								type: 'string',
								const: threads[0],
							},
						},
						required: [ 'target' ],
						additionalProperties: true,
					},
				},
				required: [ 'type', 'data' ],
				additionalProperties: true,
			} as JSONSchema6);
		};

		const query: JSONSchema6 = {
			type: 'object',
			properties: {
				type: {
					const: 'thread',
				},
			},
			required: [ 'type' ],
			additionalProperties: true,
		};

		this.threadStream = sdk.stream(query);

		this.threadStream.on('data', (response) => {
			setThreads(response.data);
		});

		this.threadStream.on('update', (response) => {
			// If before is non-null then the card has been updated
			if (response.data.before) {
				if (this.state.threads) {
					const index = _.findIndex(this.state.threads, { id: response.data.before.id });
					setThreads(
						this.state.threads.slice().splice(index, 1, response.data.after),
					);
				}
			}

			const threads = this.state.threads.slice();
			threads.push(response.data.after);

			setThreads(threads);
		});
	}

	public componentWillUpdate() {
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

	public addThread = (e: React.MouseEvent<HTMLElement>) => {
		e.preventDefault();

		return sdk.card.create({
			type: 'thread',
			data: {
				timestamp: getCurrentTimestamp(),
				actor: this.props.appState.session!.user!.id,
			},
		})
		.then((threadId) => {
			this.openChannel(threadId);
			return null;
		})
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});
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
		const tail = _.sortBy<Card>(this.state.tail, x => x.data.timestamp);

		const channelTarget = this.props.channel.data.target;

		return (
			<Column flexDirection='column'>
				<Box innerRef={(ref) => this.scrollArea = ref} p={3} flex='1' style={{ overflowY: 'auto' }}>
					{!tail && <Icon name='cog fa-spin' />}

					{(!!tail && tail.length > 0) && _.map(tail, card =>
						<Box key={card.id} py={3} style={{borderBottom: '1px solid #eee'}}>
							<EventCard
								users={this.props.appState.allUsers}
								openChannel={
									card.data && card.data.target !== channelTarget ? this.openChannel : undefined
								}
								card={card}
							/>
						</Box>)}
				</Box>

				<React.Fragment>
					<Flex p={3}
						style={{borderTop: '1px solid #eee'}}
						justify='flex-end'
					>
						<Button className='btn--add-thread' success onClick={this.addThread}>
							Add a Chat Thread
						</Button>
					</Flex>
				</React.Fragment>
			</Column>
		);
	}
}

const lens: Lens = {
	slug: 'lens-thread-list',
	type: 'lens',
	name: 'Interleaved lens',
	data: {
		icon: 'comments',
		renderer: connectComponent(Renderer),
		// This lens can display event-like objects
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					type: {
						const: 'thread',
					},
				},
			},
		},
	},
};

export default lens;

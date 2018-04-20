import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Flex,
	Txt,
	Textarea,
} from 'rendition';
import { Card, JellyfishState, Lens, RendererProps } from '../../Types';
import EventCard from '../components/Event';
import Icon from '../components/Icon';
import TailStreamer from '../components/TailStreamer';
import { createChannel, getCurrentTimestamp } from '../services/helpers';
import * as sdk from '../services/sdk';
import { actionCreators } from '../services/store';

interface RendererState {
	tail: null | Card[];
	newMessage: string;
}

interface DefaultRendererProps extends RendererProps {
	tail?: Card[];
	actions: typeof actionCreators;
	session: JellyfishState['session'];
}

// Default renderer for a card and a timeline
export class Renderer extends TailStreamer<DefaultRendererProps, RendererState> {
	private scrollArea: HTMLElement;
	private shouldScroll: boolean = true;

	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			tail: null,
			newMessage: '',
		};

		const querySchema: JSONSchema6 = {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						target: {
							const: this.props.channel.data.target,
						},
					},
					required: [ 'target' ],
					additionalProperties: true,
				},
			},
			required: [ 'type', 'data' ],
			additionalProperties: true,
		};

		if (!this.props.tail) {
			this.streamTail(querySchema);
		}

		setTimeout(() => this.scrollToBottom(), 1000);
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

	public delete() {
		this.props.actions.removeChannel(this.props.channel);
	}

	public addMessage(e: React.KeyboardEvent<HTMLElement>) {
		e.preventDefault();
		const { newMessage } = this.state;

		this.setState({ newMessage: '' });

		return sdk.card.add({
			type: 'chat-message',
			data: {
				timestamp: getCurrentTimestamp(),
				target: this.props.channel.data.target,
				actor: this.props.session!.user!.id,
				payload: {
					message: newMessage,
				},
			},
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
		const tail = this.props.tail || _.sortBy(this.state.tail, (x => x.data.timestamp);

		console.log('TAIL', tail)

		const channelTarget = this.props.channel.data.target;

		return (
			<Flex flexDirection='column' style={{ height: '100%', borderRight: '1px solid #ccc', minWidth: 350 }}>
				<Box innerRef={(ref) => this.scrollArea = ref} p={3} flex='1' style={{ overflowY: 'auto' }}>
					{!tail && <Icon name='cog fa-spin' />}

					{(!!tail && tail.length > 0) && _.map(tail, card =>
						<Box key={card.id} py={3} style={{borderBottom: '1px solid #eee'}}>
							<EventCard
								openChannel={card.data.target !== channelTarget && this.openChannel}
								card={card}
							/>
						</Box>)}

					{(!!tail && tail.length === 0) &&
						<Txt color='#ccc'>
							<em>There are no messages in this thread yet, trying adding one using the input below</em>
						</Txt>
					}
				</Box>

				<Box p={3} style={{ borderTop: '1px solid #eee' }}>
					<Textarea
						rows={1}
						value={this.state.newMessage}
						onChange={(e) => this.setState({ newMessage: e.target.value })}
						onKeyPress={(e) => e.key === 'Enter' && this.addMessage(e)}
						placeholder='Type to comment on this thread...' />
				</Box>
			</Flex>
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	session: state.session,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-interleaved',
	type: 'lens',
	name: 'Interleaved lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Renderer),
		// This lens can display event-like objects
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							timestamp: {
								type: 'string',
								format: 'date-time',
							},
							target: {
								type: 'string',
								format: 'uuid',
							},
							actor: {
								type: 'string',
								format: 'uuid',
							},
							payload: {
								type: 'object',
							},
						},
						required: [
							'timestamp',
							'target',
							'actor',
						],
					},
				},
			},
		},
	},
};

export default lens;

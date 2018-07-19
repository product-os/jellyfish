import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
	Theme,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import uuid = require('uuid/v4');
import { Card, Lens, RendererProps } from '../../Types';
import AutocompleteTextarea from '../components/AutocompleteTextarea';
import EventCard from '../components/Event';
import Icon from '../components/Icon';
import { TailStreamer } from '../components/TailStreamer';
import { sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import {
	createChannel,
	findWordsByPrefix,
	getCurrentTimestamp,
	getUserIdsByPrefix,
} from '../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	borderRight: 1px solid #ccc;
	min-width: 350px;
`;

interface RendererState {
	tail: null | Card[];
	newMessage: string;
	showNewCardModal: boolean;
	messagesOnly: boolean;
}

interface DefaultRendererProps extends RendererProps {
	actions: typeof actionCreators;
	allUsers: Card[];
	tail?: Card[];
	type?: Card;
	user: Card;
}

// Default renderer for a card and a timeline
export class Renderer extends TailStreamer<DefaultRendererProps, RendererState> {
	private fileInputElement: HTMLInputElement | null;
	private scrollArea: HTMLElement | null;
	private shouldScroll: boolean = true;

	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = this.getDefaultState();
		this.bootstrap(this.props.channel.data.target);

	}

	public getDefaultState(): RendererState {
		return {
			tail: this.props.tail ? this.sortTail(this.props.tail) : null,
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
		};
	}

	public sortTail(tail: Card[]) {
		return _.sortBy<Card>(tail, 'data.timestamp');
	}

	public bootstrap(target: string) {
		const querySchema: JSONSchema6 = {
			type: 'object',
			properties: {
				type: {
					// Don't include action request cards, as it just add's noise
					not: {
						const: 'action-request',
					},
				},
				data: {
					type: 'object',
					properties: {
						target: {
							const: target,
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

		setTimeout(() => {
			this.shouldScroll = true;

			this.scrollToBottom();
		}, 1000);
	}

	public setTail(tail: Card[]) {
		this.setState({
			tail: this.sortTail(tail),
		});
	}

	public componentWillUpdate(nextProps: DefaultRendererProps) {
		if (this.scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll = this.scrollArea.scrollTop === this.scrollArea.scrollHeight - this.scrollArea.offsetHeight;
		}

		if (_.get(nextProps.channel, [ 'data', 'target' ]) !== _.get(this.props.channel, [ 'data', 'target' ])) {
			this.setState(this.getDefaultState());
			this.bootstrap(nextProps.channel.data.target);
		}
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

		if (!newMessage) {
			return;
		}

		this.setState({ newMessage: '' });

		const { allUsers } = this.props;
		const mentions = getUserIdsByPrefix('@', newMessage, allUsers);
		const alerts = getUserIdsByPrefix('!', newMessage, allUsers);
		const tags = findWordsByPrefix('#', newMessage).map(tag => tag.slice(1));

		const id = uuid();

		const message = {
			id,
			tags,
			links: {},
			active: true,
			type: 'message',
			data: {
				timestamp: getCurrentTimestamp(),
				target: this.props.channel.data.target,
				actor: this.props.user!.id,
				payload: {
					mentionsUser: mentions,
					alertsUser: alerts,
					message: newMessage,
				},
			},
		};

		sdk.card.create(message)
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error);
			});
	}

	public openChannel = (target: string, card?: Card) => {
		// If a card is not provided, see if a matching card can be found from this
		// component's state/props
		if (!card) {
			card = _.find(_.concat(
				this.state.tail || [],
				this.props.tail || [],
			), { id: target });
		}

		const newChannel = createChannel({
			target,
			head: card,
			parentChannel: this.props.channel.id,
		});

		this.props.actions.addChannel(newChannel);
		this.props.actions.loadChannelData(newChannel);
	}

	public handleNewMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		this.setState({ newMessage: e.target.value });
	}

	public handleNewMessageKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			this.addMessage(e);
		}
	}

	public handleCheckboxToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ messagesOnly: !e.target.checked });
	}

	public handleUploadButtonClick = () => {
		const element = this.fileInputElement;

		if (element) {
			element.click();
		}
	}

	public handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = _.first(e.target.files);

		const message = {
			links: {},
			active: true,
			type: 'message',
			data: {
				timestamp: getCurrentTimestamp(),
				target: this.props.channel.data.target,
				actor: this.props.user!.id,
				payload: {
					file,
				},
			},
		};

		sdk.card.create(message)
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error);
			});

	}

	public render() {
		const { head } = this.props.channel.data;
		const { tail } = this.state;
		const channelTarget = this.props.channel.data.target;

		return (
			<Column flexDirection="column">
				<Flex m={2} justify="flex-end">
					<label>
						<input
							className="timeline__checkbox--additional-info"
							style={{marginTop: 2}}
							type="checkbox"
							checked={!this.state.messagesOnly}
							onChange={this.handleCheckboxToggle}
						/>
						<Txt.span color={Theme.colors.text.light} ml={2}>Show additional info</Txt.span>
					</label>
				</Flex>

				<div
					ref={(ref) => this.scrollArea = ref}
					style={{
						flex: 1,
						paddingLeft: 16,
						paddingRight: 16,
						paddingBottom: 16,
						overflowY: 'auto',
					}}
				>
					{!tail && <Icon name="cog fa-spin" />}

					{(!!tail && tail.length > 0) && _.map(tail, card => {
						if (this.state.messagesOnly && card.type !== 'message') {
							return null;
						}

						return (
							<Box key={card.id} py={2} style={{borderBottom: '1px solid #eee'}}>
								<EventCard
									users={this.props.allUsers}
									openChannel={
										card.data && card.data.target !== channelTarget ? this.openChannel : undefined
									}
									card={card}
								/>
							</Box>
						);
					})}
				</div>

				{head && head.type !== 'view' &&
					<Flex
						style={{ borderTop: '1px solid #eee' }}
					>
						<AutocompleteTextarea
							p={3}
							flex="1"
							className="new-message-input"
							value={this.state.newMessage}
							onChange={this.handleNewMessageChange}
							onKeyPress={this.handleNewMessageKeyPress}
							placeholder="Type to comment on this thread..."
						/>

						<Button
							square
							mr={3}
							mt={3}
							onClick={this.handleUploadButtonClick}
						>
							<Icon name="image" />
						</Button>

						<input
							style={{display: 'none'}}
							type="file"
							ref={(el) => this.fileInputElement = el}
							onChange={this.handleFileChange}
						/>
					</Flex>
				}


			</Column>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		allUsers: selectors.getAllUsers(state),
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-timeline',
	type: 'lens',
	name: 'Timeline lens',
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

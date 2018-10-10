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
import { Card, Lens, RendererProps } from '../../../Types';
import AutocompleteTextarea from '../../components/AutocompleteTextarea';
import EventCard from '../../components/Event';
import Icon from '../../components/Icon';
import { TailStreamer } from '../../components/TailStreamer';
import { analytics, sdk } from '../../core';
import { actionCreators, selectors, StoreState } from '../../core/store';
import {
	createChannel,
	findWordsByPrefix,
	getCurrentTimestamp,
	getUserIdsByPrefix,
} from '../../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	borderRight: 1px solid #ccc;
	min-width: 350px;
`;

const messageSymbolRE = /^\s*%\s*/;

interface RendererState {
	tail: null | Card[];
	newMessage: string;
	showNewCardModal: boolean;
	messagesOnly: boolean;
	streamInitialised: boolean;
	whisper: boolean;
	messageSymbol: boolean;
}

interface DefaultRendererProps extends RendererProps {
	card: Card;
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
		this.bootstrap(this.props.card.id);

	}

	public getDefaultState(): RendererState {
		return {
			tail: this.props.tail ? this.sortTail(this.props.tail) : null,
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
			streamInitialised: false,
			whisper: true,
			messageSymbol: false,
		};
	}

	public sortTail(tail: Card[]): Card[] {
		return _.sortBy<Card>(tail, 'data.timestamp');
	}

	public bootstrap(target: string): void {
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
			this.streamTail(querySchema)
				.then(() => {
					this.setState({ streamInitialised: true });
				});
		}

		setTimeout(() => {
			this.shouldScroll = true;

			this.scrollToBottom();
		}, 1000);
	}

	public setTail(tail: Card[]): void {
		this.setState({
			tail: this.sortTail(tail),
		});
	}

	public componentWillUpdate(nextProps: DefaultRendererProps): void {
		if (this.scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll = this.scrollArea.scrollTop === this.scrollArea.scrollHeight - this.scrollArea.offsetHeight;
		}

		if (_.get(nextProps.card, [ 'id' ]) !== _.get(this.props.card, [ 'id' ])) {
			this.setState(this.getDefaultState());
			this.bootstrap(nextProps.card.id);
		}
	}

	public componentDidUpdate(): void {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom();
	}

	public scrollToBottom(): void {
		if (!this.scrollArea) {
			return;
		}

		if (this.shouldScroll) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
		}
	}

	public addMessage(e: React.KeyboardEvent<HTMLElement>): void {
		e.preventDefault();
		const { newMessage } = this.state;

		if (!newMessage) {
			return;
		}

		this.setState({
			newMessage: '',
			messageSymbol: false,
		});

		const { allUsers } = this.props;
		const mentions = getUserIdsByPrefix('@', newMessage, allUsers);
		const alerts = getUserIdsByPrefix('!', newMessage, allUsers);
		const tags = findWordsByPrefix('#', newMessage).map(tag => tag.slice(1));

		const id = uuid();

		const whisper = this.state.messageSymbol ? false : this.state.whisper;

		const message = {
			id,
			tags,
			links: {},
			active: true,
			type: whisper ? 'whisper' : 'message',
			data: {
				timestamp: getCurrentTimestamp(),
				target: this.props.card.id,
				actor: this.props.user!.id,
				payload: {
					mentionsUser: mentions,
					alertsUser: alerts,
					message: newMessage.replace(messageSymbolRE, ''),
				},
			},
		};

		sdk.card.create(message)
			.then(() => {
				return sdk.card.link(id, this.props.card.id, 'is attached to');
			})
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: message.type,
					},
				});
			})
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
		const newMessage = e.target.value;
		const messageSymbol = !!newMessage.match(messageSymbolRE);
		this.setState({
			newMessage,
			messageSymbol,
		});
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

		const id = uuid();

		const message = {
			id,
			links: {},
			active: true,
			type: 'whisper',
			data: {
				timestamp: getCurrentTimestamp(),
				target: this.props.card.id,
				actor: this.props.user!.id,
				payload: {
					file,
				},
			},
		};

		sdk.card.create(message)
			.then(() => {
				return sdk.card.link(id, this.props.card.id, 'is attached to');
			})
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: 'whisper',
					},
				});
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error);
			});

	}

	public toggleWhisper = () => {
		this.setState({ whisper: !this.state.whisper });
	}

	public render(): React.ReactNode {
		const head = this.props.card;
		const { tail } = this.state;
		const channelTarget = this.props.card.id;
		const whisper = this.state.messageSymbol ? false : this.state.whisper;

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
						if (this.state.messagesOnly && card.type !== 'message' && card.type !== 'whisper') {
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

				{head && head.type !== 'view' && this.state.streamInitialised &&
					<Flex
						style={{ borderTop: '1px solid #eee' }}
						bg={whisper ? '#eee' : 'white'}
					>
						<Button
							square
							plaintext
							onClick={this.toggleWhisper}
						>
							<Icon name={whisper ? 'eye-slash' : 'eye'} />
						</Button>

						<Box flex="1">
							<AutocompleteTextarea
								py={3}
								pr={3}
								className="new-message-input"
								value={this.state.newMessage}
								onChange={this.handleNewMessageChange}
								onKeyPress={this.handleNewMessageKeyPress}
								placeholder={whisper ? 'Type your comment...' : 'Type your reply...'}
							/>
						</Box>

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
	slug: 'lens-support-thread-timeline',
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

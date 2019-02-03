/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
	Theme,
} from 'rendition';
import styled from 'styled-components';
import AutocompleteTextarea from '../components/AutocompleteTextarea';
import { Event as EventCard } from '../components/Event';
import Icon from '../components/Icon';
import { analytics, sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import {
	createChannel,
	findWordsByPrefix,
	getUserIdsByPrefix,
} from '../services/helpers';
import { Card, Lens, RendererProps } from '../types';

const Column = styled(Flex)`
	height: 100%;
	min-width: 330px;
`;

interface RendererState {
	newMessage: string;
	showNewCardModal: boolean;
	messagesOnly: boolean;
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
export class Renderer extends React.Component<DefaultRendererProps, RendererState> {
	private fileInputElement: HTMLInputElement | null;
	private scrollArea: HTMLElement | null;
	private shouldScroll: boolean = true;

	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
		};
	}

	public componentDidMount(): void {
		this.shouldScroll = true;
		this.scrollToBottom();
	}

	public componentWillUpdate(): void {
		const { scrollArea } = this;
		if (scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll = scrollArea.scrollTop >= scrollArea.scrollHeight - scrollArea.offsetHeight;
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

		this.setState({ newMessage: '' });

		const { allUsers } = this.props;
		const mentions = getUserIdsByPrefix('@', newMessage, allUsers);
		const alerts = getUserIdsByPrefix('!', newMessage, allUsers);
		const tags = findWordsByPrefix('#', newMessage).map(tag => tag.slice(1));

		const message = {
			target: this.props.card,
			type: 'message',
			tags,
			payload: {
				mentionsUser: mentions,
				alertsUser: alerts,
				message: newMessage,
			},
		};

		sdk.event.create(message)
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: 'message',
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
			card = _.find(this.props.tail || [], { id: target });
		}

		const newChannel = createChannel({
			cardType: card!.type,
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

	public handleNewMessageSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		this.addMessage(e);
	}

	public handleEventToggle = () => {
		this.setState({ messagesOnly: !this.state.messagesOnly });
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
			target: this.props.card,
			tags: [],
			type: 'message',
			payload: {
				file,
			},
		};

		sdk.event.create(message)
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: 'message',
					},
				});
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error);
			});

	}

	public getTargetId(card: Card): string {
		return _.get(card, [ 'links', 'is attached to', '0', 'id' ]) || card.id;
	}

	public render(): React.ReactNode {
		const head = this.props.card;
		const {
			card,
			actions,
			allUsers,
			tail,
			type,
			user,
			...props
		} = this.props;
		const channelTarget = card.id;
		const { messagesOnly } = this.state;

		// Due to a bug in syncing, sometimes there can be duplicate cards in tail
		const sortedTail = _.uniqBy(_.sortBy(tail, 'data.timestamp'), 'id');

		if (messagesOnly) {
			_.remove(sortedTail, (card) => {
				return card.type !== 'message' && card.type !== 'whisper';
			});
		}

		return (
			<Column flexDirection="column" {...props}>
				<Flex my={2} mr={2} justify="flex-end">
					<Button
						plaintext
						tooltip={{
							placement: 'left',
							text: `${messagesOnly ? 'Show' : 'Hide'} create and update events`,
						}}
						className="timeline__checkbox--additional-info"
						color={messagesOnly ? Theme.colors.text.light : undefined}
						ml={2}
						onClick={this.handleEventToggle}
					>
						<Icon name="stream" />
					</Button>
				</Flex>

				<div
					ref={(ref) => this.scrollArea = ref}
					style={{
						flex: 1,
						overflowY: 'auto',
						borderTop: '1px solid #eee',
						paddingTop: 8,
					}}
				>
					{!sortedTail && (
						<Box p={3}>
							<Icon name="cog fa-spin" />
						</Box>
					)}

					{(!!sortedTail && sortedTail.length > 0) && _.map(sortedTail, card => {
						return (
							<Box key={card.id}>
								<EventCard
									openChannel={
										this.getTargetId(card) !== channelTarget ? this.openChannel : undefined
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
							onTextSubmit={this.handleNewMessageSubmit}
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
	version: '1.0.0',
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
							'actor',
						],
					},
				},
			},
		},
	},
};

export default lens;

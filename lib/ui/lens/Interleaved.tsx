/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import ResizeObserver from 'react-resize-observer';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
	Theme,
} from 'rendition';
import styled from 'styled-components';
import uuid = require('uuid/v4');
import { Event as EventCard } from '../components/Event';
import { analytics, sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';
import { Card, Lens, RendererProps } from '../types';

import Icon from '../shame/Icon';

const Column = styled(Flex)`
	height: 100%;
	min-width: 350px;
	position: relative;
`;

const NONE_MESSAGE_TIMELINE_TYPES = [
	'create',
	'event',
	'update',
];

const isHiddenEventType = (type: string) => {
	return _.includes(NONE_MESSAGE_TIMELINE_TYPES, type);
};

interface InterleavedState {
	creatingCard: boolean;
	newMessage: string;
	showNewCardModal: boolean;
	messagesOnly: boolean;
	loadingPage: boolean;
}

interface InterleavedProps extends RendererProps {
	allUsers: Card[];
	tail?: Card[];
	type?: Card;
	actions: typeof actionCreators;
	setPage: (page: number) => void;
	page: number;
}

export class Interleaved extends React.Component<InterleavedProps, InterleavedState> {
	private scrollArea: HTMLElement | null;
	private shouldScroll: boolean = true;
	private loadingPage: boolean = false;
	private scrollBottomOffset: number = 0;

	constructor(props: InterleavedProps) {
		super(props);

		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
			loadingPage: false,
		};

		setTimeout(() => this.scrollToBottom());
	}

	public componentWillUpdate(): void {
		if (!this.scrollArea) {
			return;
		}

		// Only set the scroll flag if the scroll area is already at the bottom
		this.shouldScroll = this.scrollArea.scrollTop >= this.scrollArea.scrollHeight - this.scrollArea.offsetHeight;
	}

	public componentDidUpdate(nextProps: InterleavedProps): void {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom();

		if (
			nextProps.tail && this.props.tail &&
			(nextProps.tail.length !== this.props.tail.length)
		) {
			window.requestAnimationFrame(() => {
				const { scrollArea } = this;
				if (!scrollArea) {
					return;
				}
				scrollArea.scrollTop = scrollArea.scrollHeight - this.scrollBottomOffset - scrollArea.offsetHeight;
			});
		}

	}

	public scrollToBottom = () => {
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
		const newChannel = createChannel({
			target,
			cardType: card!.type,
			parentChannel: this.props.channel.id,
		});

		this.props.actions.addChannel(newChannel);
	}

	public addThread = (e: React.MouseEvent<HTMLElement>) => {
		e.preventDefault();

		const { head } = this.props.channel.data;

		if (!head) {
			console.warn('.addThread() called, but there is no head card');
			return;
		}

		const schema = getViewSchema(head);

		if (!schema) {
			console.warn('.addThread() called, but there is no view schema available');
			return;
		}

		const cardData = getUpdateObjectFromSchema(schema);

		cardData.slug = `thread-${uuid()}`;
		cardData.type = 'thread';
		if (!cardData.data) {
			cardData.data = {};
		}

		this.setState({ creatingCard: true });

		sdk.card.create(cardData as Card)
			.then((thread) => {
				if (thread) {
					this.openChannel(thread.id, thread);
				}
				return null;
			})
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: cardData.type,
					},
				});
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message);
			})
			.finally(() => {
				this.setState({ creatingCard: false });
			});
	}

	public handleEventToggle = () => {
		this.setState({ messagesOnly: !this.state.messagesOnly });
	}

	public handleScroll = async () => {
		const { scrollArea, loadingPage } = this;

		if (!scrollArea) {
			return;
		}

		this.scrollBottomOffset = scrollArea.scrollHeight - (scrollArea.scrollTop + scrollArea.offsetHeight);

		if (loadingPage) {
			return;
		}

		if (scrollArea.scrollTop > 200) {
			return;
		}

		this.loadingPage = true;

		await this.props.setPage(this.props.page + 1);

		this.loadingPage = false;
	}

	public getTargetId(card: Card): string {
		return _.get(card, [ 'links', 'is attached to', '0', 'id' ]) || card.id;
	}

	public render(): React.ReactNode {
		const { head } = this.props.channel.data;
		const channelTarget = this.props.channel.data.target;
		const { messagesOnly } = this.state;

		const tail: Card[] | null = this.props.tail ? _.reverse(this.props.tail.slice()) : null;

		return (
			<Column flex="1" flexDirection="column">
				<ResizeObserver onResize={this.scrollToBottom} />
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
					onScroll={this.handleScroll}
					style={{
						flex: 1,
						overflowY: 'auto',
						borderTop: '1px solid #eee',
						paddingTop: 8,
					}}
				>
					<Box p={3}>
						<Icon name="cog fa-spin" />
					</Box>

					{(!!tail && tail.length > 0) && _.map(tail, card => {
						if (messagesOnly && isHiddenEventType(card.type)) {
							return null;
						}

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

				{head && head.slug !== 'view-my-alerts' && head.slug !== 'view-my-mentions' &&
					<Flex
						p={3}
						style={{borderTop: '1px solid #eee'}}
						justify="flex-end"
					>
						<Button
							className="btn--add-thread"
							success={true}
							onClick={this.addThread}
							disabled={this.state.creatingCard}
						>
							{this.state.creatingCard && <Icon name="cog fa-spin" />}
							{!this.state.creatingCard && 'Add a Chat thread'}
						</Button>
					</Flex>
				}
			</Column>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		allUsers: selectors.getAllUsers(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-interleaved',
	type: 'lens',
	version: '1.0.0',
	name: 'Interleaved lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Interleaved),
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

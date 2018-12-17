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
	Txt,
} from 'rendition';
import styled from 'styled-components';
import uuid = require('uuid/v4');
import { Card, Lens, RendererProps } from '../../types';
import { Event as EventCard } from '../components/Event';
import Icon from '../components/Icon';
import { analytics, sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	border-right: 1px solid #ccc;
	min-width: 350px;
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
}

interface InterleavedProps extends RendererProps {
	allUsers: Card[];
	tail?: Card[];
	type?: Card;
	actions: typeof actionCreators;
}

export class Interleaved extends React.Component<InterleavedProps, InterleavedState> {
	private scrollArea: HTMLElement | null;
	private shouldScroll: boolean = true;

	constructor(props: InterleavedProps) {
		super(props);

		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
		};

		setTimeout(() => this.scrollToBottom());
	}

	public componentWillUpdate(): void {
		if (!this.scrollArea) {
			return;
		}

		// Only set the scroll flag if the scroll area is already at the bottom
		this.shouldScroll = this.scrollArea.scrollTop === this.scrollArea.scrollHeight - this.scrollArea.offsetHeight;
	}

	public componentDidUpdate(): void {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom();
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
		if (!card) {
			card = _.find(this.props.tail || [], { id: target });
		}
		const newChannel = createChannel({
			target,
			head: card,
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
					this.openChannel(thread.id);
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

	public handleCheckboxToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ messagesOnly: !e.target.checked });
	}

	public render(): React.ReactNode {
		const { head } = this.props.channel.data;
		const channelTarget = this.props.channel.data.target;

		const tail: Card[] | null = this.props.tail ? _.sortBy(this.props.tail, 'data.timestamp') : null;

		return (
			<Column flex="1" flexDirection="column">
				<ResizeObserver onResize={this.scrollToBottom} />
				<Flex m={2} justify="flex-end">
					<label>
						<input
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
					{(!!tail && tail.length > 0) && _.map(tail, card => {
						if (this.state.messagesOnly && isHiddenEventType(card.type)) {
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

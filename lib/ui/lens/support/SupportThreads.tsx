import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Flex,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import uuid = require('uuid/v4');
import { Card, Lens, RendererProps } from '../../../types';
import { analytics, sdk } from '../../core';
import { actionCreators, selectors, StoreState } from '../../core/store';
import {
	createChannel,
	findUsernameById,
	getUpdateObjectFromSchema,
	getViewSchema,
	timeAgo,
} from '../../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	width: 100%;
`;

interface InterleavedState {
	creatingCard: boolean;
	newMessage: string;
	showNewCardModal: boolean;
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
		};

		setTimeout(() => this.scrollToBottom(), 1000);
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

	public scrollToBottom(): void {
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

	public render(): React.ReactNode {
		const tail: Card[] = _.sortBy(this.props.tail, (element: any) => {
			return _.get(_.last(element.links['has attached element']), [ 'data', 'timestamp' ]);
		}).reverse() as any;

		return (
			<Column flexDirection="column">
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
					{(!!tail && tail.length > 0) && _.map(tail, (card: any) => {
						const actorId = _.get(_.first(card.links['has attached element']), [ 'data', 'actor' ]);
						const messages = _.filter(card.links['has attached element'], { type: 'message' });
						const lastMessageOrWhisper = _.last(_.filter(card.links['has attached element'], (event) => event.type === 'message' || event.type === 'whisper'));

						const actorName = findUsernameById(this.props.allUsers, actorId);

						return (
							<Box
								key={card.id}
								py={2}
								style={{borderBottom: '1px solid #eee', cursor: 'pointer'}}
								onClick={() => this.openChannel(card.id)}
							>
								<Flex justify="space-between">
									<Box>
										{!!card.name && (
											<Txt bold>{card.name}</Txt>
										)}
										<Txt my={2}><strong>{actorName}</strong></Txt>
									</Box>

									<Txt>{timeAgo(_.get(_.last(card.links['has attached element']), [ 'data', 'timestamp' ]))}</Txt>
								</Flex>
								<Txt my={2}>{messages.length} message{messages.length !== 1 && 's'}</Txt>
								{lastMessageOrWhisper && (
									<Txt
										style={{
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											border: '1px solid #eee',
											borderRadius: 10,
											padding: '8px 16px',
											background: (lastMessageOrWhisper || {}).type === 'whisper' ? '#eee' : 'white',
										}}
									>
										{_.get(lastMessageOrWhisper, [ 'data', 'payload', 'message' ], '').split('\n').shift()}
									</Txt>
								)}
							</Box>
						);
					})}
				</div>
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
	slug: 'lens-support-threads',
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

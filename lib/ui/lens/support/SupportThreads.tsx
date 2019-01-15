import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Flex,
	Pill,
	Theme,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { Card, Lens, RendererProps } from '../../../types';
import Gravatar from '../../components/Gravatar';
import { actionCreators, selectors, StoreState } from '../../core/store';
import {
	colorHash,
	createChannel,
	formatTimestamp,
	timeAgo,
} from '../../services/helpers';
import { getActor } from '../../services/store-helpers';

const Column = styled(Flex)`
	height: 100%;
	width: 100%;
`;

const SupportThreadSummaryWrapper = styled(Box)`
	border-left-style: solid;
	border-left-width: 3px;
	border-bottom: 1px solid #eee;
	cursor: pointer;
	transition: background ease-in-out 150ms;

	&:hover {
		background: ${Theme.colors.gray.light};
	}
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
	constructor(props: InterleavedProps) {
		super(props);

		this.state = {
			creatingCard: false,
			newMessage: '',
			showNewCardModal: false,
		};
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
	}

	public render(): React.ReactNode {
		const tail: Card[] = _.sortBy(this.props.tail, (element: any) => {
			return _.get(_.last(element.links['has attached element']), [ 'data', 'timestamp' ]);
		}).reverse() as any;

		return (
			<Column flexDirection="column">
				{!!tail && (
					<Box px={3} pb={2} style={{boxShadow: '0px 1px 3px #eee'}}>
						<Pill primary>{tail.length} support threads</Pill>
					</Box>
				)}

				<div
					style={{
						flex: 1,
						paddingBottom: 16,
						overflowY: 'auto',
					}}
				>
					{(!!tail && tail.length > 0) && _.map(tail, (card: any) => {
						const messages = _.filter(card.links['has attached element'], { type: 'message' });
						const lastMessageOrWhisper = _.last(_.filter(card.links['has attached element'], (event) => event.type === 'message' || event.type === 'whisper'));

						const createCard = _.first((card as any).links['has attached element'])! as Card;
						const actor = getActor(createCard.data.actor);
						const lastActor = lastMessageOrWhisper ? getActor(lastMessageOrWhisper.data.actor) : null;

						return (
							<SupportThreadSummaryWrapper
								key={card.id}
								p={3}
								style={{
									borderLeftColor: colorHash(card.id),
								}}
								onClick={() => this.openChannel(card.id)}
							>
								<Flex justify="space-between">
									{card.data.inbox && (
										<Pill mb={2} bg={colorHash(card.data.inbox)}>{card.data.inbox}</Pill>
									)}

									<Txt>Created {formatTimestamp(card.created_at)}</Txt>
								</Flex>
								<Flex justify="space-between">
									<Box>
										{!!card.name && (
											<Txt bold>{card.name}</Txt>
										)}
										{!card.name && !!actor && (
											<Txt bold>{`Conversation with ${actor.name}`}</Txt>
										)}
									</Box>

									<Txt>Updated {timeAgo(_.get(_.last(card.links['has attached element']), [ 'data', 'timestamp' ]))}</Txt>
								</Flex>
								<Txt my={2}>{messages.length} message{messages.length !== 1 && 's'}</Txt>
								{lastMessageOrWhisper && (
									<Flex>
										<Gravatar
											small
											pr={2}
											email={lastActor ? lastActor.email : null}
										/>

										<Txt
											style={{
												whiteSpace: 'nowrap',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												border: '1px solid #eee',
												borderRadius: 10,
												padding: '4px 16px',
												background: (lastMessageOrWhisper || {}).type === 'whisper' ? '#eee' : 'white',
												flex: 1,
											}}
										>
											{_.get(lastMessageOrWhisper, [ 'data', 'payload', 'message' ], '').split('\n').shift()}
										</Txt>
									</Flex>
								)}
							</SupportThreadSummaryWrapper>
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

import ColorHash = require('color-hash');
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { Card } from '../../Types';
import { findUsernameById, formatTimestamp } from '../services/helpers';
import Icon from './Icon';
import Markdown from './Markdown';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));

const EventWrapper = styled(Flex)`
	word-break: break-all;

	.event-card--timestamp {
		color: #777;
		opacity: 0;
	}

	&:hover {
		.event-card--timestamp {
			opacity: 1;
		}
	}
`;

const TIMELINE_TYPES = [
	'create',
	'update',
	'message',
];


interface EventProps {
	users: Card[];
	card: Card;
	openChannel?: (target: string) => void;
	[k: string]: any;
}

export default class Event extends React.Component<EventProps, { actorName: string }> {
	constructor(props: EventProps) {
		super(props);

		this.state = {
			actorName: findUsernameById(props.users, props.card.data.actor),
		};
	}

	public openChannel = () => {
		const { card, openChannel } = this.props;
		if (!openChannel) {
			return;
		}

		const id = _.get(card, 'data.target') || card.id;
		openChannel(id);
	}

	public getTimelineText(card: Card) {
		if (card.type === 'create') {
			return 'created by';
		}
		if (card.type === 'update') {
			return 'updated by';
		}

		return `${card.name ? card.name + ' - ' : ''}${card.type}`;
	}

	public render() {
		const { card, openChannel, ...props } = this.props;

		const isMessage = card.type === 'message';
		const isTimelineCard = _.includes(TIMELINE_TYPES, card.type);

		let icon = 'database';

		if (isMessage) {
			icon = 'comment fa-flip-horizontal';
		}

		if (!isTimelineCard) {
			icon = 'asterisk';
		}

		return (
			<EventWrapper className={`event-card--${card.type}`} {...props}>
				<Button
					plaintext={true}
					onClick={this.openChannel}
					mr={3}
				>
					<Txt color={threadColor(isTimelineCard ? card.data.target : card.id)}>
						<Icon name={icon} />
					</Txt>
				</Button>
				<Box flex="1">
					{isTimelineCard &&
						<React.Fragment>
							<Flex justify="space-between" mb={2}>
								<Txt mt={isMessage ? 0 : '5px'}>
									{!isMessage && `${this.getTimelineText(card)} `}

									<strong>{this.state.actorName}</strong>
								</Txt>

								{!!card.data && !!card.data.timestamp &&
									<Txt className="event-card--timestamp" fontSize={1}>{formatTimestamp(card.data.timestamp)}</Txt>
								}
							</Flex>

							{isMessage &&
								<Markdown className="event-card__message">{card.data.payload.message}</Markdown>
							}
						</React.Fragment>
					}
					{!isTimelineCard &&
						<React.Fragment>
							<Flex justify="space-between" mb={2}>
								<Txt bold={true}>
									{`${card.name ? card.name + ' - ' : ''}${card.type}`}
								</Txt>
								{card.data && !!card.data.timestamp &&
									<Txt className="event-card--timestamp" fontSize={1}>{formatTimestamp(card.data.timestamp)}</Txt>
								}
							</Flex>
						</React.Fragment>
					}
				</Box>
			</EventWrapper>
		);
	}
}

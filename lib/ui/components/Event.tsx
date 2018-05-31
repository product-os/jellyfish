import ColorHash = require('color-hash');
import * as _ from 'lodash';
import * as moment from 'moment';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { Card } from '../../Types';
import Icon from './Icon';
import Markdown from './Markdown';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));

const TODAY = moment().startOf('day');
const isToday = (momentDate: moment.Moment)  => {
	return momentDate.isSame(TODAY, 'd');
};

const formatTimestamp = _.memoize((stamp: string): string => {
	const momentDate = moment(stamp);
	if (isToday(momentDate)) {
		return momentDate.format('k:mm');
	}

	return momentDate.format('ddd Do, YYYY k:mm');
});


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

		const actor = _.find(props.users, { id: props.card.data.actor });

		let actorName = 'unknown user';

		if (actor) {
			actorName = actor.slug!.replace('user-', '');
		}

		this.state = {
			actorName,
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
								<Txt bold={true}>{this.state.actorName}</Txt>
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

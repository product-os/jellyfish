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
import Icon from './Icon';
import Markdown from './Markdown';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));

const EventWrapper = styled(Flex)`
	word-break: break-all;
`

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

	public render() {
		const { card, openChannel, ...props } = this.props;

		const isChatMessage = card.type === 'chat-message';

		return (
			<EventWrapper className={`event-card--${card.type}`} {...props}>
				{isChatMessage &&
					<Button
						plaintext
						onClick={() => !!openChannel && !!card.data && openChannel(card.data.target)}
						mr={3} >
						<Txt color={threadColor(card.data.target)}>
							<Icon name='comment fa-flip-horizontal' />
						</Txt>
					</Button>
				}
				<Box ml={isChatMessage ? 0 : 34} flex='1'>
					<Flex justify='space-between' mb={2}>
						<Txt bold>{this.state.actorName}</Txt>
						{card.data &&
						<Txt fontSize={1}>{card.data.timestamp}</Txt>}
					</Flex>

					{isChatMessage &&
					<Markdown className='event-card__message'>{card.data.payload.message}</Markdown>}
					{!isChatMessage && `${card.type} card`}
				</Box>
			</EventWrapper>
		);
	}
}

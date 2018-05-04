import ColorHash = require('color-hash');
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	Txt,
} from 'rendition';
import { Card } from '../../Types';
import { sdk } from '../app';
import Icon from './Icon';
import Markdown from './Markdown';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));

interface EventProps {
	card: Card;
	openChannel?: (target: string) => void;
	[k: string]: any;
}

export default class Event extends React.Component<EventProps, { username: string }> {
	constructor(props: EventProps) {
		super(props);

		this.state = {
			username: '',
		};

		if (this.props.card.type === 'chat-message') {
			sdk.user.getUsername(props.card.data.actor)
			.then((username) => this.setState({ username }));
		}
	}

	public render() {
		const { card, openChannel, ...props } = this.props;

		const isChatMessage = card.type === 'chat-message';

		return (
			<Flex className={`event-card--${card.type}`} {...props}>
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
				<Box flex='1'>
					<Flex justify='space-between' mb={2}>
						<Txt bold>{this.state.username || card.type}</Txt>
						{card.data &&
						<Txt fontSize={1}>{card.data.timestamp}</Txt>}
					</Flex>

					{card.type === 'chat-message' &&
					<Markdown className='event-card__message'>{card.data.payload.message}</Markdown>}
				</Box>
			</Flex>
		);
	}
}

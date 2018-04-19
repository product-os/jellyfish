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
import * as sdk from '../services/sdk';
import Icon from './Icon';

const colorHash = new ColorHash();
const threadColor = _.memoize((text: string): string => colorHash.hex(text));

interface ChatMessageProps {
	card: Card;
	openChannel?: (target: string) => void;
	[k: string]: any;
}

export default class ChatMessage extends React.Component<ChatMessageProps, { username: string }> {
	constructor(props: ChatMessageProps) {
		super(props);

		this.state = {
			username: '',
		};

		sdk.user.getUsername(props.card.data.actor)
		.then((username) => this.setState({ username }));
	}

	public render() {
		const { card, openChannel, ...props } = this.props;

		return (
			<Flex {...props} style={{minHeight: 46 }}>
				<Button
					plaintext
					onClick={() => openChannel && openChannel(card.data.target)}
					mr={3} >
					<Txt color={threadColor(card.data.target)}>
						<Icon name='comment fa-flip-horizontal' />
					</Txt>
				</Button>
				<Box flex='1'>
					<Flex justify='space-between' mb={2}>
						<Txt bold>{this.state.username}</Txt>
						<Txt fontSize={1}>{card.data.timestamp}</Txt>
					</Flex>

					<Txt>{card.data.payload.message}</Txt>
				</Box>
			</Flex>
		);
	}
}

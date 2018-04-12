import ColorHash = require('color-hash');
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	Text,
} from 'rendition';
import { Card } from '../../Types';
import { getUsername } from '../services/sdk';
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

		getUsername(props.card.data.actor)
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
					<Text color={threadColor(card.data.target)}>
						<Icon name='comment fa-flip-horizontal' />
					</Text>
				</Button>
				<Box flex='1'>
					<Flex justify='space-between' mb={2}>
						<Text bold>{this.state.username}</Text>
						<Text fontSize={1}>{card.data.timestamp}</Text>
					</Flex>

					<Text>{card.data.payload.message}</Text>
				</Box>
			</Flex>
		);
	}
}

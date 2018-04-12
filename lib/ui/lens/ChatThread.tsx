import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Flex,
	Text,
	Textarea,
} from 'rendition';
import { Card, JellyfishState, Lens, RendererProps } from '../../Types';
import ChatMessage from '../components/ChatMessage';
import Icon from '../components/Icon';
import { getCurrentTimestamp } from '../services/helpers';
import { addCard, JellyfishStream, streamQuery } from '../services/sdk';
import { actionCreators } from '../services/store';

interface RendererState {
	tail: null | Card[];
	newMessage: string;
}

interface DefaultRendererProps extends RendererProps {
	actions: typeof actionCreators;
	session: JellyfishState['session'];
}

// Default renderer for a card and a timeline
export class Renderer extends React.Component<DefaultRendererProps, RendererState> {
	private stream: JellyfishStream;

	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			tail: null,
			newMessage: '',
		};

		this.streamTail();
	}

	public componentWillUnmount() {
		this.stream.destroy();
	}

	public streamTail() {
		this.stream = streamQuery({
			type: 'object',
			properties: {
				type: {
					const: 'chat-message',
				},
				data: {
					type: 'object',
					properties: {
						target: {
							const: this.props.channel.data.target,
						},
					},
					required: [ 'target' ],
					additionalProperties: true,
				},
			},
			required: [ 'type', 'data' ],
			additionalProperties: true,
		});

		this.stream.on('data', (response) => {
			this.setState({ tail: response.data });
		});

		this.stream.on('update', (response) => {
			// If `before` is non-null then the card has been updated
			if (response.data.before) {
				return this.setState((prevState) => {
					if (prevState.tail) {
						const index = _.findIndex(prevState.tail, { id: response.data.before.id });
						prevState.tail.splice(index, 1, response.data.after);
					}
					return { tail: prevState.tail };
				});
			}

			return this.setState((prevState) => {
				const tail = prevState.tail || [];
				tail.push(response.data.after);
				return { tail };
			});
		});
	}

	public delete() {
		this.props.actions.removeChannel(this.props.channel);
	}

	public addMessage(e: React.KeyboardEvent<HTMLElement>) {
		e.preventDefault();
		const { newMessage } = this.state;

		this.setState({ newMessage: '' });

		return addCard({
			type: 'chat-message',
			data: {
				timestamp: getCurrentTimestamp(),
				target: this.props.channel.data.target,
				actor: this.props.session!.user!.id,
				payload: {
					message: newMessage,
				},
			},
		});
	}

	public render() {
		const { tail } = this.state;

		return (
			<Flex flexDirection='column' style={{ height: '100%', borderRight: '1px solid #ccc', minWidth: 300 }}>
				<Box p={3} flex='1' style={{ overflowY: 'auto' }}>
					{!tail && <Icon name='cog fa-spin' />}

					{(!!tail && tail.length > 0) && _.map(tail, card =>
						<Box key={card.id} my={3}><ChatMessage card={card} /></Box>)}

					{(!!tail && tail.length === 0) &&
						<Text color='#ccc'>
							<em>There are no messages in this thread yet, trying adding one using the input below</em>
						</Text>
					}
				</Box>

				<Box p={3} style={{ borderTop: '1px solid #eee' }}>
					<Textarea
						rows={1}
						value={this.state.newMessage}
						onChange={(e) => this.setState({ newMessage: e.target.value })}
						onKeyPress={(e) => e.key === 'Enter' && this.addMessage(e)}
						placeholder='Type to comment on this thread...' />
				</Box>
			</Flex>
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	session: state.session,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-chat-thread',
	type: 'lens',
	name: 'Chat thread lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Renderer),
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'chat-thread',
				},
			},
		},
	},
};

export default lens;

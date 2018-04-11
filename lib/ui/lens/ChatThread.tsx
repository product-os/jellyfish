import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Box, Flex, Heading, Textarea } from 'rendition';
import { Card, JellyfishState, Lens, RendererProps } from '../../Types';
import ChatMessage from '../components/ChatMessage';
import Icon from '../components/Icon';
import { getCurrentTimestamp } from '../services/helpers';
import { addCard, query } from '../services/sdk';
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
	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			tail: null,
			newMessage: '',
		};

		this.loadTail();
	}

	public loadTail() {
		query<Card>({
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
		})
		.tap((tail) => console.log('GOT TAIL', tail))
		.then((tail) => this.setState({ tail }));
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
		})
		.then(() => this.loadTail());
	}

	public render() {
		const { tail } = this.state;

		return (
			<Box p={3} style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 300, position: 'relative' }}>
				<Box>
					{!tail && <Icon name='cog fa-spin' />}
					{!!tail && _.map(tail, card => <Box my={3}><ChatMessage card={card} /></Box>)}
				</Box>
				<Box p={3} style={{position: 'absolute', left: 0, bottom: 0, right: 0, borderTop: '1px solid #eee'}}>
					<Textarea
						rows={1}
						value={this.state.newMessage}
						onChange={(e) => this.setState({ newMessage: e.target.value })}
						onKeyPress={(e) => e.key === 'Enter' && this.addMessage(e)}
						placeholder='Type to comment on this thread...' />
				</Box>
			</Box>
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

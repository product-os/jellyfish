import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Box, Flex, Heading } from 'rendition';
import { Card, Lens, RendererProps } from '../../Types';
import CardActions from '../components/CardActions';
import CardRenderer from '../components/CardRenderer';
import Icon from '../components/Icon';
import * as sdk from '../services/sdk';
import { actionCreators } from '../services/store';

interface RendererState {
	tail: null | Card[];
	head: null | Card;
}

interface DefaultRendererProps extends RendererProps {
	actions: typeof actionCreators;
}

// Default renderer for a card and a timeline
export class Renderer extends React.Component<DefaultRendererProps, RendererState> {
	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			head: null,
			tail: null,
		};

		this.loadTail();
	}

	public loadTail() {
		sdk.card.getTimeline(this.props.channel.data.target)
		.then((tail) => this.setState({ tail }));
	}

	public refresh() {
		this.props.actions.loadChannelData(this.props.channel);
	}

	public delete() {
		this.props.actions.removeChannel(this.props.channel);
	}

	public render() {
		const { channel } = this.props;
		const { tail } = this.state;

		return (
			<Box p={3} style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 270 }}>
				<CardActions card={channel.data.head!}
					delete={() => this.delete()}
					refresh={() => this.refresh()}/>
				<CardRenderer card={channel.data.head!} />
				<Box>
					<Heading.h3 mb={3}>Timeline</Heading.h3>
					{!tail && <Icon name='cog fa-spin' />}
					{!!tail && _.map(tail, card =>
						<Flex
							key={card.id}
							pt={2} my={3}
							align='center'
							justify='space-between'
							style={{ borderTop: '1px solid #eee' }}>
							<Box>
								<strong>{card.type}</strong>
							</Box>

							<Box>
								{card.data.timestamp}
							</Box>
						</Flex>,
					)}
				</Box>
			</Box>
		);
	}
}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-default',
	type: 'lens',
	name: 'Default lens',
	data: {
		icon: 'address-card',
		renderer: connect(null, mapDispatchToProps)(Renderer),
		filter: {
			type: 'object',
		},
	},
};

export default lens;

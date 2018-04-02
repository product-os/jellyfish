import * as _ from 'lodash';
import * as React from 'react';
import { Alert, Box, Divider } from 'rendition';
import { RendererProps } from '../../Types';

// Load renderers
import CardRenderer from './CardRenderer';
import ViewRenderer from './ViewRenderer';

// Selects an appropriate renderer for a card
const ChannelRenderer = (props: RendererProps) => {
	const { channel } = props;
	if (!channel.data.head && !channel.data.tail) {
		if (channel.data.error) {
			return <Alert m={2} danger>{channel.data.error.toString()}</Alert>;
		}

		return <Box p={3}><i className='fas fa-cog fa-spin' /></Box>;
	}

	const baseType = channel.data.type;

	if (baseType === 'view') {
		return <ViewRenderer {...props} />;
	}

	return (
		<Box>
			<CardRenderer card={channel.data.head!} refresh={this.props.refresh} />
			<Divider />
			<Box>
				{_.map(channel.data.tail, card =>
					<CardRenderer key={card.id} card={card} refresh={this.props.refresh} />)}
			</Box>
		</Box>
	);
};

export default ChannelRenderer;

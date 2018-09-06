import * as React from 'react';
import { Alert, Box } from 'rendition';
import { RendererProps } from '../../Types';

// Load lens service
import LensService from '../lens';

// Selects an appropriate renderer for a card
const ChannelRenderer = (props: RendererProps) => {
	const { channel } = props;
	if (!channel.data.head) {
		if (channel.data.error) {
			return <Alert m={2} danger={true}>{channel.data.error.toString()}</Alert>;
		}

		return (
			<Box flex="1">
				<Box p={3}>
					<i className="fas fa-cog fa-spin" />
				</Box>
			</Box>
		);

	}

	const lens = LensService.getLens(channel.data.head!);

	return <lens.data.renderer card={channel.data.head} level={0} {...props} />;
};

export default ChannelRenderer;

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

		return <Box p={3}><i className="fas fa-cog fa-spin" /></Box>;
	}

	const lenses = LensService.getLenses(channel.data.head!);

	const lens = lenses[0];

	return <lens.data.renderer {...props} />;
};

export default ChannelRenderer;

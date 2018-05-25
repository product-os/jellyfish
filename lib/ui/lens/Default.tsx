import * as React from 'react';
import { Box, Flex } from 'rendition';
import styled from 'styled-components';
import { Card, Lens, RendererProps } from '../../Types';
import { CardActions } from '../components/CardActions';
import { CardRenderer } from '../components/CardRenderer';
import { connectComponent, ConnectedComponentProps } from '../services/helpers';
import InterleavedLens from './Interleaved';

const Column = styled(Flex)`
	height: 100%;
	overflow-y: auto;
	min-width: 270px;
`;

interface RendererState {
	tail: null | Card[];
	head: null | Card;
}

interface DefaultRendererProps extends RendererProps, ConnectedComponentProps {}

// Default renderer for a card and a timeline
export class Renderer extends React.Component<DefaultRendererProps, RendererState> {
	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			head: null,
			tail: null,
		};
	}

	public refresh = () => {
		this.props.actions.loadChannelData(this.props.channel);
	}

	public delete = () => {
		this.props.actions.removeChannel(this.props.channel);
	}

	public render() {
		const { channel } = this.props;
		const { head } = channel.data;

		return (
			<Column
				className={`column--${head ? head.slug || head.type : 'unknown'}`}
				flex="1"
				flexDirection="column"
			>
				<Box p={3} style={{maxHeight: '50%', borderBottom: '1px solid #ccc', overflowY: 'auto'}}>
					<CardActions
						card={channel.data.head!}
						delete={this.delete}
						refresh={this.refresh}
					/>

					<CardRenderer card={channel.data.head!} />
				</Box>

				<Box flex="1 0 50%" style={{ overflowY: 'auto'}}>
					<InterleavedLens.data.renderer channel={this.props.channel} />
				</Box>
			</Column>
		);
	}
}

const lens: Lens = {
	slug: 'lens-default',
	type: 'lens',
	name: 'Default lens',
	data: {
		icon: 'address-card',
		renderer: connectComponent(Renderer),
		filter: {
			type: 'object',
		},
	},
};

export default lens;

import * as React from 'react';
import { Badge, Box, Divider, Heading, Text } from 'rendition';
import { Card } from '../../Types';
import DataRenderer from './DataRenderer';

export interface CardRendererProps {
	card: Card;
	openChannel: (promise: Promise<Card[]>) => void;
}

export default class CardRenderer extends React.Component<CardRendererProps, {}> {
	public render() {
		const { card } = this.props;
		return (
			<Box mb={3}>
				{card.name && <Heading.h3>{card.name}</Heading.h3>}
				<Text>{card.id}</Text>
				{card.tags && card.tags.map(tag => <Badge key={tag} text={tag} />)}
				{card.data &&
						<Box>
							<Heading.h4 mb={2}>Data</Heading.h4>
							<DataRenderer data={card.data} />
						</Box>
				}
				<Divider />
			</Box>
		);
	}
}

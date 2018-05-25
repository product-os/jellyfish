import * as _ from 'lodash';
import * as React from 'react';
import { Box, Heading, Link, Txt } from 'rendition';
import styled from 'styled-components';
import { Card, Channel } from '../../Types';
import { connectComponent, ConnectedComponentProps, createChannel } from '../services/helpers';
import Label from './Label';

const DataContainer = styled.pre`
	background: none;
	color: inherit;
	border: 0;
	margin: 0;
	padding: 0;
	font-size: inherit;
	white-space: pre-wrap;
	word-wrap: break-word;
`;

const CardField = ({ field, payload }: {
	field: string;
	payload: { [key: string]: any };
}) => {
	return (
		<React.Fragment>
			<Label my={3}>{field}</Label>
			{_.isObject(payload[field]) ?
				<Txt monospace={true}>
					<DataContainer>{JSON.stringify(payload[field], null, 4)}</DataContainer>
				</Txt>
				: <Txt>{`${payload[field]}`}</Txt>}
		</React.Fragment>
	);
};

interface CardProps extends ConnectedComponentProps {
	card: Card;
	fieldOrder?: string[];
	channel?: Channel;
}

class Base extends React.Component<CardProps, {}> {
	public openChannel = () => {
		if (!this.props.channel) {
			return;
		}

		const { card } = this.props;

		this.props.actions.addChannel(createChannel({
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public render() {
		const payload = this.props.card.data;
		const { card, fieldOrder } = this.props;

		const unorderedKeys = _.filter(
			_.keys(payload),
			(key) => !_.includes(fieldOrder, key),
		);

		return (
			<Box mb={3}>
				<Heading.h4 my={3}>
					{!!this.props.channel &&
						<Link onClick={this.openChannel}>
							{card.name || card.slug || card.type}
						</Link>
					}
					{!this.props.channel && (card.name || card.slug || card.type)}
				</Heading.h4>

				{_.map(fieldOrder, (key) =>
					!!payload[key] ?
						<CardField key={key} field={key} payload={payload} />
						: null)
				}

				{_.map(unorderedKeys, (key) =>
					<CardField key={key} field={key} payload={payload} />)}

			</Box>
		);
	}
}

export const CardRenderer = connectComponent(Base);

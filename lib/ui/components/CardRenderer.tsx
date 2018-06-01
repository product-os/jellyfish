import * as _ from 'lodash';
import * as React from 'react';
import { Box, Flex, Heading, Link, Txt } from 'rendition';
import styled from 'styled-components';
import { Card, Channel } from '../../Types';
import {
	connectComponent,
	ConnectedComponentProps,
	createChannel,
	findUsernameById,
	formatTimestamp,
} from '../services/helpers';
import { CardActions } from './CardActions';
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

const UsersBadge = styled(Txt)`
	display: inline-block;
	background: #555;
	color: white;
	border-radius: 4px;
	padding: 1px 8px;
	margin-right: 4px;
	font-size: 14px;
`;

const CardField = ({ field, payload, users }: {
	field: string;
	payload: { [key: string]: any };
	users: Card[];
}) => {
	const value = payload[field];
	if (field === 'alertsUser' || field === 'mentionsUser') {
		const len = value.length;
		if (!len || !users) {
			return null;
		}
		const names = value.map((id: string) => findUsernameById(users, id));
		return (
			<UsersBadge
				tooltip={names.join(', ')}
				my={1}
			>
				{field === 'alertsUser' ? 'Alerts' : 'Mentions'} {len} user{len !== 1 && 's'}
			</UsersBadge>
		);
	}
	if (field === 'actor') {
		return <Txt my={3} bold>{findUsernameById(users, value)}</Txt>;
	}

	// Rendering can be optimzed for some known fields
	if (field === 'timestamp') {
		return <Txt my={3} color="#777">{formatTimestamp(value)}</Txt>;
	}

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

	public refresh = () => {
		const channel = _.find(this.props.appState.channels, (c) => c.data.target === this.props.card.id);
		if (channel) {
			this.props.actions.loadChannelData(channel);
		}
	}

	public delete = () => {
		const channel = _.find(this.props.appState.channels, (c) => c.data.target === this.props.card.id);
		if (channel) {
			this.props.actions.removeChannel(channel);
		}
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
				<Flex justify="space-between">
					<Heading.h4 my={3}>
						{!!this.props.channel &&
							<Link onClick={this.openChannel}>
								{card.name || card.slug || card.type}
							</Link>
						}
						{!this.props.channel && (card.name || card.slug || card.type)}
					</Heading.h4>

					<CardActions
						card={card}
						delete={this.delete}
						refresh={this.refresh}
					/>
				</Flex>


				{_.map(fieldOrder, (key) =>
					!!payload[key] ?
						<CardField key={key} field={key} payload={payload} users={this.props.appState.allUsers} />
						: null)
				}

				{_.map(unorderedKeys, (key) =>
					<CardField key={key} field={key} payload={payload} users={this.props.appState.allUsers} />)}

			</Box>
		);
	}
}

export const CardRenderer = connectComponent(Base);

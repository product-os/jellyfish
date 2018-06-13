import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { Box, Flex, Heading, Link, Txt } from 'rendition';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import styled from 'styled-components';
import { Card, Channel } from '../../Types';
import {
	connectComponent,
	ConnectedComponentProps,
} from '../services/connector';
import {
	createChannel,
	findUsernameById,
	formatTimestamp,
	getLocalSchema,
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

const Badge = styled(Txt)`
	display: inline-block;
	background: #555;
	color: white;
	border-radius: 4px;
	padding: 1px 8px;
	margin-right: 4px;
	font-size: 14px;
`;

const CardField = ({ field, payload, users, schema }: {
	field: string;
	payload: { [key: string]: any };
	users: Card[];
	schema?: JSONSchema6;
}) => {
	const value = payload[field];
	if (value === undefined) {
		return null;
	}
	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null;
	}
	if (field === 'alertsUser' || field === 'mentionsUser') {
		const len = value.length;
		if (!len || !users) {
			return null;
		}
		const names = value.map((id: string) => findUsernameById(users, id));
		return (
			<Badge
				tooltip={names.join(', ')}
				my={1}
			>
				{field === 'alertsUser' ? 'Alerts' : 'Mentions'} {len} user{len !== 1 && 's'}
			</Badge>
		);
	}
	if (field === 'actor') {
		return <Txt my={3} bold>{findUsernameById(users, value)}</Txt>;
	}

	// Rendering can be optimzed for some known fields
	if (field === 'timestamp') {
		return <Txt my={3} color="#777">{formatTimestamp(value)}</Txt>;
	}

	if (schema && schema.format === 'mermaid') {
		return (
			<React.Fragment>
				<Label my={3}>{field}</Label>
				<Mermaid value={value} />
			</React.Fragment>
		);
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
		const typeCard = _.find(this.props.appState.types, { slug: card.type });
		const typeSchema = _.get(typeCard, 'data.schema');
		const localSchema = getLocalSchema(card);

		// Local schemas are considered weak and are overridden by a type schema
		const schema = _.merge({
			type: 'object',
			properties: {
				data: localSchema,
			},
		}, typeSchema);

		const unorderedKeys = _.filter(
			_.keys(payload),
			(key) => !_.includes(fieldOrder, key),
		);

		const keys = (fieldOrder || []).concat(unorderedKeys);

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


				{_.map(keys, (key) => {
					return !!payload[key] ?
						<CardField
							key={key}
							field={key}
							payload={payload}
							users={this.props.appState.allUsers}
							schema={_.get(schema, ['properties', 'data', 'properties', key])}
						/>
						: null;
					})
				}

			</Box>
		);
	}
}

export const CardRenderer = connectComponent(Base);

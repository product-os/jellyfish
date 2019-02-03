/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { circularDeepEqual } from 'fast-equals';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Flex,
	Heading,
	Link,
	Txt
} from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import styled from 'styled-components';
import { actionCreators, selectors, StoreState } from '../core/store';
import {
	createChannel,
	findUsernameById,
	formatTimestamp,
	getLocalSchema,
} from '../services/helpers';
import { Card, Channel, Type } from '../types';
import { CardActions } from './CardActions';
import Label from './Label';
import { Tag } from './Tag';

const Badge = styled(Txt)`
	display: inline-block;
	background: #555;
	color: white;
	border-radius: 4px;
	padding: 1px 8px;
	margin-right: 4px;
	font-size: 14px;
`;

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

	if (schema && schema.format === 'markdown') {
		return (
			<React.Fragment>
				<Label my={3}>{field}</Label>
				<Markdown>{value}</Markdown>
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

interface CardProps {
	card: Card;
	allUsers: Card[];
	types: Type[];
	fieldOrder?: string[];
	channel?: Channel;
	actions: typeof actionCreators;
}

class Base extends React.Component<CardProps, {}> {
	public openChannel = () => {
		if (!this.props.channel) {
			return;
		}

		const { card } = this.props;

		this.props.actions.addChannel(createChannel({
			target: card.id,
			cardType: card.type,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public shouldComponentUpdate(nextProps: CardProps): boolean {
		return !circularDeepEqual(nextProps, this.props);
	}

	public refresh = () => {
		const { channel } = this.props;
		if (channel) {
			this.props.actions.loadChannelData(channel);
		}
	}

	public delete = () => {
		const { channel } = this.props;
		if (channel) {
			this.props.actions.removeChannel(channel);
		}
	}


	public render(): React.ReactNode {
		const payload = this.props.card.data;
		const { card, fieldOrder, channel } = this.props;
		const typeCard = _.find(this.props.types, { slug: card.type });
		const typeSchema = _.get(typeCard, 'data.schema');
		const localSchema = getLocalSchema(card);

		// Local schemas are considered weak and are overridden by a type schema
		const schema = _.merge({}, {
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

		const inView = _.get(channel, ['data', 'head', 'type']) === 'view';

		return (
			<Box mb={3}>
				<Flex justify="space-between">
					<Heading.h4 my={3}>
						{inView &&
							<Link onClick={this.openChannel}>
								{card.name || card.slug || card.type}
							</Link>
						}
						{!inView && (card.name || card.slug || card.type)}
					</Heading.h4>

					{!inView &&
						<CardActions
							card={card}
						/>
					}
				</Flex>

				{!!card.tags && card.tags.length > 0 &&
					<Box mb={1}>
						{_.map(card.tags, (tag) => {
							return <Tag mr={1}>#{tag}</Tag>;
						})}
					</Box>
				}

				{_.map(keys, (key) => {
					return !!payload[key] ?
						<CardField
							key={key}
							field={key}
							payload={payload}
							users={this.props.allUsers}
							schema={_.get(schema, ['properties', 'data', 'properties', key])}
						/>
						: null;
					})
				}

			</Box>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		allUsers: selectors.getAllUsers(state),
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const CardRenderer = connect(mapStateToProps, mapDispatchToProps)(Base);

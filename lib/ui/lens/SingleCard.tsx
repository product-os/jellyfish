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
	Link,
	Txt
} from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import styled from 'styled-components';
import { CardActions } from '../components/CardActions';
import Label from '../components/Label';
import { Tag } from '../components/Tag';
import { actionCreators, selectors, StoreState } from '../core/store';
import {
	createChannel,
	formatTimestamp,
	getLocalSchema,
} from '../services/helpers';
import { getActor } from '../services/store-helpers';
import { Card, Lens, RendererProps, Type } from '../types';
import TimelineLens from './Timeline';

import { CloseButton } from '../shame/CloseButton';

const Column = styled(Flex)`
	height: 100%;
	overflow-y: auto;
	min-width: 270px;
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
		const names = value.map((id: string) => getActor(id).name);
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
		return <Txt my={3} bold>{getActor(value).name}</Txt>;
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

interface CardProps extends RendererProps {
	level: number;
	card: Card;
	allUsers: Card[];
	types: Type[];
	fieldOrder?: string[];
	actions: typeof actionCreators;
	isDragging: any;
}

class SingleCard extends React.Component<CardProps, {}> {
	public openChannel = () => {
		if (this.props.level === 0) {
			return;
		}

		const { card } = this.props;

		this.props.actions.addChannel(createChannel({
			cardType: card.type,
			target: card.id,
			head: card,
		}));
	}

	public shouldComponentUpdate(nextProps: CardProps): boolean {
		return !circularDeepEqual(nextProps, this.props);
	}

	public render(): React.ReactNode {
		const { card, fieldOrder, level } = this.props;
		const payload = card.data;
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
		const cardSlug = _.get(card, 'slug');
		const cardType = _.get(card, 'type');

		const content = (
			<>
				<Flex justify="space-between">
					<Txt mb={3}>
						<strong>
						{level > 0 &&
							<Link onClick={this.openChannel} className={`header-link header-link--${card.slug || card.id}`}>
								{card.name || card.slug || card.type}
							</Link>
						}
						{!level && (
							<div style={{ fontSize: 14, display: 'block' }}>
								{card.name || card.slug || card.type}
							</div>
						)}
						</strong>
					</Txt>

					{!level && (
						<Flex align="baseline">
							<CardActions
								card={card}
							/>

							<CloseButton
								mb={3}
								mr={-3}
								onClick={() => this.props.actions.removeChannel(this.props.channel)}
							/>
						</Flex>
					)}
				</Flex>

				{!!card.tags && card.tags.length > 0 &&
					<Box mb={1}>
						{_.map(card.tags, (tag) => {
							return <Tag key={tag} mr={1}>#{tag}</Tag>;
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
			</>
		);

		if (!level) {
			return (
				<Column
					className={`column--${cardType || 'unknown'} column--slug-${cardSlug || 'unkown'}`}
					flex={this.props.flex}
					flexDirection="column"
				>
					<Box
						p={3}
						flex="1"
						style={{overflowY: 'auto'}}
					>
						{content}
					</Box>
					<Box
						style={{ maxHeight: '50%' }}
						flex="0"
					>
						<TimelineLens.data.renderer
							card={this.props.card}
							tail={this.props.card.links['has attached element']}
						/>
					</Box>
				</Column>
			);
		}

		return (
			<Box mb={3}>
				{content}
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

export const Renderer = connect(mapStateToProps, mapDispatchToProps)(SingleCard);

const lens: Lens = {
	slug: 'lens-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		icon: 'address-card',
		renderer: Renderer,
		filter: {
			type: 'object',
		},
	},
};

export default lens;
